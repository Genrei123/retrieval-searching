package com.example.retrieval_search.generation;

import com.example.retrieval_search.domain.DocumentSection;
import com.example.retrieval_search.repository.DocumentSectionRepository;
import com.example.retrieval_search.search.SearchHit;
import com.example.retrieval_search.search.SearchService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/** Orchestrates the retrieve-then-generate flow: run search, pull full section bodies for the
 * hits, then feed them to the LLM as context. Shared by any endpoint that answers or explains
 * something using the retrieval index (currently /answer and /topics). */
@Service
public class GenerationService {

    private final SearchService searchService;
    private final DocumentSectionRepository sectionRepository;
    private final OllamaClient ollamaClient;

    public GenerationService(SearchService searchService,
                              DocumentSectionRepository sectionRepository,
                              OllamaClient ollamaClient) {
        this.searchService = searchService;
        this.sectionRepository = sectionRepository;
        this.ollamaClient = ollamaClient;
    }

    public RagOutcome answerQuestion(String question, int topK, UUID documentId) {
        return generate(question, topK, documentId, this::answerPrompt);
    }

    public RagOutcome explainTopic(String topic, int topK, UUID documentId) {
        return generate(topic, topK, documentId, this::topicPrompt);
    }

    /** Retrieves the same way as {@link #answerQuestion}, but streams the generated answer token
     * by token instead of returning it all at once. {@code onSources} fires once, as soon as
     * retrieval finishes; {@code onToken} fires once per chunk of generated text. */
    public void streamAnswer(String question, int topK, UUID documentId,
                              Consumer<List<SearchHit>> onSources, Consumer<String> onToken) {
        SearchService.SearchOutcome outcome = searchService.search(question, 0, topK, documentId);
        List<SearchHit> hits = outcome.hits();
        onSources.accept(hits);

        Map<UUID, DocumentSection> sectionsById = sectionRepository
                .findByIds(hits.stream().map(SearchHit::sectionId).toList())
                .stream()
                .collect(Collectors.toMap(DocumentSection::id, s -> s));

        List<DocumentSection> orderedContext = hits.stream()
                .map(h -> sectionsById.get(h.sectionId()))
                .filter(Objects::nonNull)
                .toList();

        if (orderedContext.isEmpty()) {
            onToken.accept("No relevant sections were found.");
            return;
        }

        ollamaClient.generateStream(answerPrompt(buildContext(orderedContext), outcome.query()), onToken);
    }

    private RagOutcome generate(String query, int topK, UUID documentId,
                                 BiFunction<String, String, String> promptBuilder) {
        SearchService.SearchOutcome outcome = searchService.search(query, 0, topK, documentId);
        List<SearchHit> hits = outcome.hits();

        Map<UUID, DocumentSection> sectionsById = sectionRepository
                .findByIds(hits.stream().map(SearchHit::sectionId).toList())
                .stream()
                .collect(Collectors.toMap(DocumentSection::id, s -> s));

        List<DocumentSection> orderedContext = hits.stream()
                .map(h -> sectionsById.get(h.sectionId()))
                .filter(Objects::nonNull)
                .toList();

        String text = orderedContext.isEmpty()
                ? "No relevant sections were found."
                : ollamaClient.generate(promptBuilder.apply(buildContext(orderedContext), outcome.query()));

        return new RagOutcome(outcome.query(), text, hits);
    }

    private String buildContext(List<DocumentSection> sections) {
        return sections.stream()
                .map(s -> "### " + (s.headingPath() == null ? "(untitled)" : s.headingPath()) + "\n" + s.body())
                .collect(Collectors.joining("\n\n"));
    }

    private String answerPrompt(String context, String question) {
        return """
                Answer the question using ONLY the context below. The context may not define the \
                exact term directly — if so, synthesize the best answer you can from whatever \
                related material is present (e.g. subsections of the topic, adjacent concepts) \
                and note what aspect isn't fully covered. Only say you don't know if the context \
                is genuinely unrelated to the question. Be concise and cite the section headings \
                you used.

                Context:
                %s

                Question: %s

                Answer:
                """.formatted(context, question);
    }

    private String topicPrompt(String context, String topic) {
        return """
                Write a clear, well-organized explanation of the topic below, using ONLY the context \
                provided. Cover the key points found in the context and organize them logically. If \
                the context only partially covers the topic, explain what is covered and note what is \
                missing. Cite the section headings you used.

                Context:
                %s

                Topic: %s

                Explanation:
                """.formatted(context, topic);
    }

    public record RagOutcome(String query, String text, List<SearchHit> sources) {
    }
}
