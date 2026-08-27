package com.example.retrieval_search.chunking;

/** Constants from spec §2 "Chunking rules". */
public final class ChunkingRules {

    public static final int TARGET_WORDS = 400;
    public static final int HARD_MAX_WORDS = 800;
    public static final int MIN_WORDS = 50;

    private ChunkingRules() {
    }
}
