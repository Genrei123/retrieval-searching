package com.example.retrieval_search.domain;

/**
 * FUZZY is part of the API contract but unused in this POC — trigram fuzzy
 * fallback (spec §5.3) was descoped, so results are only ever EXACT or SYNONYM.
 */
public enum MatchType {
    EXACT,
    SYNONYM,
    FUZZY
}
