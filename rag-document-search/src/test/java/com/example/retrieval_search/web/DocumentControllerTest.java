package com.example.retrieval_search.web;

import com.example.retrieval_search.domain.Document;
import com.example.retrieval_search.ingestion.*;
import com.example.retrieval_search.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DocumentControllerTest {
    private final AsyncIngestionRunner runner = mock(AsyncIngestionRunner.class);
    private final JobStore jobs = new JobStore();
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final UUID id = UUID.randomUUID();
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new DocumentController(runner, jobs, documents,
                mock(DocumentSectionRepository.class), mock(DocumentFileRepository.class)))
                .setControllerAdvice(new ApiExceptionHandler()).build();
        when(documents.findById(id)).thenReturn(Optional.of(new Document(id, "Original", null,
                "markdown", "1", Instant.now(), "checksum")));
    }

    @Test
    void multipartCreateQueuesUpload() throws Exception {
        mvc.perform(multipart("/api/v1/documents").file(new MockMultipartFile("file", "guide.md", "text/markdown", "Text".getBytes()))
                .param("title", "Guide")).andExpect(status().isAccepted()).andExpect(jsonPath("$.jobId").exists());
        verify(runner).run(any(), eq("Guide"), isNull(), eq("markdown"), eq("1"), eq("guide.md"), any());
    }

    @Test
    void multipartMetadataUpdateNeedsNoFile() throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/documents/{id}", id)
                .param("title", "Renamed").param("version", "2").param("sourceUri", "dataset"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.jobId").exists());
        verify(runner).update(any(), eq(id), eq("Renamed"), eq("dataset"), eq("2"), isNull(), isNull(), isNull());
    }

    @Test
    void replacementQueuesSpecifiedId() throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/documents/{id}", id)
                .file(new MockMultipartFile("file", "updated.md", "text/markdown", "New".getBytes()))
                .param("title", "Renamed")).andExpect(status().isAccepted());
        verify(runner).update(any(), eq(id), eq("Renamed"), isNull(), eq("1"), eq("markdown"), eq("updated.md"), any());
    }

    @Test
    void invalidInputIsRejectedBeforeQueuing() throws Exception {
        mvc.perform(multipart("/api/v1/documents").file(new MockMultipartFile("file", "guide.md", "text/markdown", new byte[0]))
                .param("title", "Guide")).andExpect(status().isBadRequest());
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/documents/{id}", id).param("title", " "))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/documents/{id}", UUID.randomUUID()).param("title", "Missing"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(runner);
    }

    @Test
    void jobResponseIncludesProgressAndDeleteCallsRepository() throws Exception {
        var jobId = jobs.create();
        mvc.perform(get("/api/v1/documents/jobs/{id}", jobId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.stage").value("QUEUED"))
                .andExpect(jsonPath("$.progress.maxWords").value(800));
        when(documents.deleteById(id)).thenReturn(true);
        mvc.perform(delete("/api/v1/documents/{id}", id)).andExpect(status().isNoContent());
        verify(documents).deleteById(id);
    }
}
