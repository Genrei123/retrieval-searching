package com.example.retrieval_search.generation;

import com.example.retrieval_search.domain.DocumentSection;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GenerationService {

    private final OllamaClient ollamaClient;

    public GenerationService(OllamaClient ollamaClient) {
        this.ollamaClient = ollamaClient;
    }

    public String answer(String query, List<DocumentSection> contextSections) {
        if (contextSections.isEmpty()) {
            return "No relevant sections were found to answer this question.";
        }

        String context = contextSections.stream()
                .map(s -> "### " + (s.headingPath() == null ? "(untitled)" : s.headingPath()) + "\n" + s.body())
                .collect(Collectors.joining("\n\n"));

        String prompt = """
                Answer the question using ONLY the context below. If the context does not contain \
                the answer, say you don't know. Be concise and cite the section headings you used.

                Context:
                %s

                Question: %s

                Answer:
                """.formatted(context, query);

        return ollamaClient.generate(prompt);
    }
}
