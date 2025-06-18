import { generateCFRLink } from '../lib/cfr-processor.js';

export function validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
        throw new Error('Valid user ID is required');
    }
    return userId.trim();
}

export function formatConditionResponse(condition, cfrData, recommendation) {
    // Handle the new CFR data structure with sections array
    const primarySection = cfrData.sections && cfrData.sections.length > 0 ? cfrData.sections[0] : null;
    
    return {
        id: condition.id,
        title: condition.name,
        summary: recommendation.summary,
        cfrSection: primarySection ? primarySection.identifier : null,
        cfrTitle: primarySection ? primarySection.label : null,
        cfrText: primarySection ? primarySection.content : null,
        cfrLink: primarySection ? generateCFRLink(primarySection.identifier) : null,
        recommendedPercentage: recommendation.recommendedPercentage,
        supportingFactors: recommendation.supportingFactors,
        allSections: cfrData.sections || [],
        lastUpdated: new Date().toISOString()
    };
}

export function createErrorResponse(statusCode, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            error: message,
            timestamp: new Date().toISOString()
        })
    };
}

export function createSuccessResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: true,
            data,
            timestamp: new Date().toISOString()
        })
    };
}