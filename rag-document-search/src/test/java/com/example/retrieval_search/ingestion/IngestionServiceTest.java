package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.chunking.*;
import com.example.retrieval_search.domain.*;
import com.example.retrieval_search.extraction.MarkdownTextExtractor;
import com.example.retrieval_search.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class IngestionServiceTest {
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final DocumentSectionRepository sections = mock(DocumentSectionRepository.class);
    private final DocumentFileRepository files = mock(DocumentFileRepository.class);
    private final IngestionService service = new IngestionService(documents, sections, files,
            List.of(new MarkdownTextExtractor()), new MarkdownChunker(), new PlainTextChunker());
    private final UUID id = UUID.randomUUID();
    private final Document original = new Document(id, "Original", "source", "markdown", "1", Instant.now(), "old-checksum");

    @Test
    void replacementKeepsIdAndPublishesActualChunkOutput() {
        when(documents.findByIdForUpdate(id)).thenReturn(Optional.of(original));
        var progress = new ArrayList<IngestionProgress>();
        byte[] bytes = ("# New heading\n" + "word ".repeat(1650)).getBytes(StandardCharsets.UTF_8);
        var result = service.update(id, "Renamed", "new-source", "2", "markdown", "new.md", bytes, progress::add);
        assertThat(result.documentId()).isEqualTo(id);
        assertThat(result.status()).isEqualTo(JobStatus.DONE);
        assertThat(progress).extracting(IngestionProgress::stage).containsExactly("EXTRACTING", "CHUNKING", "INDEXING");
        var captured = ArgumentCaptor.forClass(Document.class);
        verify(documents).upsert(captured.capture());
        assertThat(captured.getValue().title()).isEqualTo("Renamed");
        assertThat(captured.getValue().version()).isEqualTo("2");
        verify(sections).deleteByDocumentId(id);
        verify(sections).insertAll(argThat(chunks -> {
            assertThat(chunks).hasSize(progress.getLast().totalChunks());
            for (int i = 0; i < chunks.size(); i++) {
                assertThat(chunks.get(i).documentId()).isEqualTo(id);
                assertThat(chunks.get(i).ordinal()).isEqualTo(i);
                assertThat(progress.getLast().chunks().get(i).preview()).isEqualTo(
                        chunks.get(i).body().substring(0, Math.min(300, chunks.get(i).body().length())));
            }
            return true;
        }));
        verify(files).upsert(argThat(file -> file.documentId().equals(id) && Arrays.equals(file.content(), bytes)));
    }

    @Test
    void metadataEditKeepsOriginalFileAndChunks() {
        when(documents.findByIdForUpdate(id)).thenReturn(Optional.of(original));
        var result = service.update(id, "Renamed", "reference", "2", null, null, null, ignored -> {});
        assertThat(result.status()).isEqualTo(JobStatus.SKIPPED_UNCHANGED);
        verifyNoInteractions(sections, files);
        verify(documents).upsert(argThat(doc -> doc.id().equals(id) && doc.title().equals("Renamed")
                && doc.checksum().equals(original.checksum())));
    }

    @Test
    void missingDocumentCannotBeRecreatedByALateReplacementJob() {
        assertThatThrownBy(() -> service.update(id, "Title", null, "1", "markdown", "file.md",
                "text".getBytes(StandardCharsets.UTF_8), ignored -> {})).isInstanceOf(ResponseStatusException.class);
        verify(documents, never()).upsert(any());
        verifyNoInteractions(sections, files);
    }

    @Test
    void invalidReplacementDoesNotTouchExistingContent() {
        when(documents.findByIdForUpdate(id)).thenReturn(Optional.of(original));
        assertThatThrownBy(() -> service.update(id, "Title", null, "1", "markdown", "empty.md",
                "   ".getBytes(StandardCharsets.UTF_8), ignored -> {})).isInstanceOf(IllegalArgumentException.class);
        verify(documents, never()).upsert(any());
        verifyNoInteractions(sections, files);
    }

    @Test
    void createDoesNotSilentlyReplaceADifferentDocumentWithSameTitle() {
        when(documents.findByTitle("Original")).thenReturn(Optional.of(original));
        assertThatThrownBy(() -> service.ingest("Original", null, "markdown", "1", "file.md",
                "Different".getBytes(StandardCharsets.UTF_8))).isInstanceOf(ResponseStatusException.class);
        verify(documents, never()).upsert(any());
    }
}
