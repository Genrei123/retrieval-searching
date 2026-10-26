package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.domain.*;
import com.example.retrieval_search.chunking.SectionDraft;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class JobStoreTest {
    @Test
    void completionKeepsChunkPreviewAndFailureKeepsLastRealStage() {
        var jobs = new JobStore();
        var id = jobs.create();
        var progress = IngestionProgress.extracted("HEADINGS", "word ".repeat(500))
                .chunked(List.of(new SectionDraft("Heading", "word ".repeat(500), null)));
        jobs.progress(id, progress);
        jobs.update(id, JobStatus.DONE, "Saved", id);
        assertThat(jobs.find(id).orElseThrow().progress().chunks()).hasSize(1);
        assertThat(jobs.find(id).orElseThrow().progress().stage()).isEqualTo("DONE");
        jobs.progress(id, progress);
        jobs.update(id, JobStatus.FAILED, "Failed", id);
        assertThat(jobs.find(id).orElseThrow().progress().stage()).isEqualTo("INDEXING");
    }

    @Test
    void previewMemoryIsBoundedAndOlderFinishedJobsAreEvicted() {
        var drafts = java.util.stream.IntStream.range(0, 200)
                .mapToObj(i -> new SectionDraft("Heading", "word ".repeat(500), null)).toList();
        var preview = IngestionProgress.extracted("HEADINGS", "words").chunked(drafts);
        assertThat(preview.totalChunks()).isEqualTo(200);
        assertThat(preview.chunks()).hasSize(100).allSatisfy(c -> assertThat(c.preview()).hasSize(300));
        var jobs = new JobStore();
        for (int i = 0; i < 200; i++) {
            var id = jobs.create();
            jobs.update(id, JobStatus.DONE, "Saved", id);
            assertThat(jobs.find(id)).isPresent();
        }
    }
}
