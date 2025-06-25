const https = require('https');
const AWSXRay = require('aws-xray-sdk-core');

// Enable X-Ray tracing for HTTPS requests
const httpsTraced = AWSXRay.captureHTTPs(https);

/**
 * Lambda function to search eCFR API for VA disability rating criteria
 */
exports.handler = async (event) => {
    // Create a new X-Ray segment
    const segment = AWSXRay.getSegment();
    const subsegment = segment.addNewSubsegment('handler');
    
    try {
        console.log('Event received:', JSON.stringify(event, null, 2));
        // Check if this is a direct invocation (not through Bedrock Agent)
        if (event.condition && (event.bodySystem || event.body_system || event.keywords)) {
            return await handleDirectInvocation(event);
        }

        const { messageVersion, agent, actionGroup, function: functionName, parameters } = event;

        if (functionName === 'searchCFR') {
            return await searchCFR(parameters);
        } else if (functionName === 'getCFRSection') {
            return await getCFRSection(parameters);
        }

        // Fallback: log and return error with event structure
        console.error('No matching handler for event:', JSON.stringify(event, null, 2));
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'No matching handler for event',
                event
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            messageVersion: "1.0",
            response: {
                actionGroup: event.actionGroup,
                function: event.function,
                functionResponse: {
                    responseBody: {
                        "TEXT": {
                            "body": `Error: ${error.message}`
                        }
                    }
                }
            }
        };
    }
};

/**
 * Handle direct invocation from cfr-processor
 */
async function handleDirectInvocation(event) {
    const { condition, bodySystem, body_system, keywords } = event;
    const system = bodySystem || body_system;
    
    console.log(`Direct invocation for condition: ${condition}, body system: ${system}`);
    
    try {
        // Search for CFR sections related to the condition
        const searchQuery = condition;
        const part = '4'; // VA disability ratings are in Part 4
        
        // Get the structure of 38 CFR Part 4
        const structureUrl = `https://www.ecfr.gov/api/versioner/v1/structure/2024-01-01/title-38.json`;
        console.log(`Fetching structure from: ${structureUrl}`);

        const data = await makeHttpsRequest(structureUrl);
        console.log('Structure data received, searching for sections...');

        // Filter to Part 4 sections that might match the search query
        let part4Sections = filterSections(data, searchQuery, part);
        
        // If no sections found, try alternative search strategies
        if (part4Sections.length === 0) {
            console.log('No direct matches found, trying alternative search strategies...');
            
            // Strategy 1: Try body system specific terms if available
            if (system) {
                const systemTerms = getBodySystemTerms(system);
                for (const term of systemTerms) {
                    const alternativeSections = filterSections(data, term, part);
                    if (alternativeSections.length > 0) {
                        part4Sections = alternativeSections;
                        console.log(`Found ${alternativeSections.length} sections using body system term: ${term}`);
                        break;
                    }
                }
            }
            
            // Strategy 2: Try common medical condition categories
            if (part4Sections.length === 0) {
                const commonCategories = getCommonMedicalCategories(condition);
                for (const category of commonCategories) {
                    const alternativeSections = filterSections(data, category, part);
                    if (alternativeSections.length > 0) {
                        part4Sections = alternativeSections;
                        console.log(`Found ${alternativeSections.length} sections using category: ${category}`);
                        break;
                    }
                }
            }
            
            // Strategy 3: Try broader anatomical terms
            if (part4Sections.length === 0) {
                const anatomicalTerms = getAnatomicalTerms(condition);
                for (const term of anatomicalTerms) {
                    const alternativeSections = filterSections(data, term, part);
                    if (alternativeSections.length > 0) {
                        part4Sections = alternativeSections;
                        console.log(`Found ${alternativeSections.length} sections using anatomical term: ${term}`);
                        break;
                    }
                }
            }
        }

        if (part4Sections.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    condition: condition,
                    bodySystem: system,
                    sections: [],
                    message: `No specific CFR sections found for "${condition}" in Part 4. This may be a newer condition or may be rated under a different category.`
                })
            };
        }

        // Get detailed content for the top matching sections
        const detailedSections = [];
        for (const section of part4Sections.slice(0, 3)) {
            try {
                const content = await getCFRSectionContent(section.identifier);
                detailedSections.push({
                    identifier: section.identifier,
                    label: section.label,
                    description: section.description,
                    content: content
                });
            } catch (error) {
                console.error(`Error getting content for section ${section.identifier}:`, error);
                detailedSections.push({
                    identifier: section.identifier,
                    label: section.label,
                    description: section.description,
                    content: 'Content not available'
                });
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                condition: condition,
                bodySystem: system,
                sections: detailedSections,
                totalFound: part4Sections.length
            })
        };

    } catch (error) {
        console.error('Direct invocation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                condition: condition,
                bodySystem: system
            })
        };
    }
}

/**
 * Search for CFR sections related to a medical condition
 */
async function searchCFR(parameters) {
    const searchQuery = parameters.find(p => p.name === 'searchQuery')?.value || '';
    const part = parameters.find(p => p.name === 'part')?.value || '4';

    console.log(`Searching CFR Part ${part} for: ${searchQuery}`);

    try {
        // Get the structure of 38 CFR Part 4
        const structureUrl = `https://www.ecfr.gov/api/versioner/v1/structure/2024-01-01/title-38.json`; // Fixed date
        console.log(`Fetching structure from: ${structureUrl}`);

        const data = await makeHttpsRequest(structureUrl);
        console.log('Structure data received, searching for sections...');

        // Filter to Part 4 sections that might match the search query
        const part4Sections = filterSections(data, searchQuery, part);

        if (part4Sections.length === 0) {
            // Return basic information if no specific matches
            return formatResponse('searchCFR', `No specific CFR sections found for "${searchQuery}" in Part ${part}. You may want to try searching for specific body parts or conditions like "musculoskeletal", "mental", "respiratory", etc.`);
        }

        // Return the section information we found
        let responseText = `Found ${part4Sections.length} relevant CFR section(s) for "${searchQuery}":\n\n`;

        part4Sections.slice(0, 5).forEach(section => {
            responseText += `**38 CFR § ${section.identifier}** - ${section.label}\n`;
            if (section.description) {
                responseText += `${section.description}\n`;
            }
            responseText += '\n';
        });

        responseText += '\nNote: This shows the section titles. For detailed rating criteria, ask me to get the specific section content (e.g., "Get me 38 CFR section 4.71a").';

        const finalResponse = formatResponse('searchCFR', hyperlinkUrls(responseText)); // Apply hyperlink function
        console.log("searchCFR Final Response:", JSON.stringify(finalResponse)); // Log the final response
        return finalResponse;

    } catch (error) {
        console.error('Search error:', error);
        const errorResponse = formatResponse('searchCFR', hyperlinkUrls(`Error searching CFR: ${error.message}. The eCFR API may be temporarily unavailable.`)); // Apply hyperlink function
        console.log("searchCFR Error Response:", JSON.stringify(errorResponse)); // Log error response
        return errorResponse;
    }
}

/**
 * Helper function to find a section in the CFR structure
 */
function findSectionInStructure(data, sectionIdentifier) {
    function searchNode(node) {
        if (node.identifier === sectionIdentifier) {
            return node;
        }

        if (node.children) {
            for (const child of node.children) {
                const found = searchNode(child);
                if (found) return found;
            }
        }

        return null;
    }

    return searchNode(data);
}

/**
 * Get a specific CFR section
 */
async function getCFRSection(parameters) {
    const sectionNumber = parameters.find(p => p.name === 'sectionNumber')?.value || '';

    console.log(`Getting CFR section: ${sectionNumber}`);

    try {
        const content = await getCFRSectionContent(sectionNumber);

        if (!content) {
            return formatResponse('getCFRSection', `Section 38 CFR § ${sectionNumber} not found`);
        }

        const responseText = `**38 CFR § ${sectionNumber}**\n\n${content}`;
        const finalResponse = formatResponse('getCFRSection', hyperlinkUrls(responseText)); // Apply hyperlink function
        console.log("getCFRSection Final Response:", JSON.stringify(finalResponse)); // Log final response
        return finalResponse;

    } catch (error) {
        console.error('Get section error:', error);
        const errorResponse = formatResponse('getCFRSection', hyperlinkUrls(`Error retrieving CFR section: ${error.message}`)); // Apply hyperlink function
        console.log("getCFRSection Error Response:", JSON.stringify(errorResponse)); // Log error response
        return errorResponse;
    }
}

/**
 * Get content for a specific CFR section
 */
async function getCFRSectionContent(sectionIdentifier) {
    try {
        // Correctly construct the URL for the content API based on documentation
        const url = `https://www.ecfr.gov/api/versioner/v1/full/2024-01-01/title-38.xml?part=4&section=${sectionIdentifier}`;
        console.log(`Getting content from: ${url}`);
        
        const data = await makeHttpsRequest(url);
        
        // The content is directly in the response, we need to extract and format it
        const extractedText = extractTextFromContent(data);
        
        if (!extractedText) {
            console.warn(`No content found for section ${sectionIdentifier} in the response.`);
            return `No detailed content could be extracted for section ${sectionIdentifier}. The section may exist but content is not available via the API.`;
        }
        
        console.log(`Successfully extracted content for ${sectionIdentifier}. Length: ${extractedText.length}`);
        return extractedText;
        
    } catch (error) {
        console.error(`Error getting content for section ${sectionIdentifier}:`, error);
        return `Could not retrieve content for section ${sectionIdentifier} due to an error: ${error.message}`;
    }
}

/**
 * Filter sections from the structure data based on search query
 */
function filterSections(data, searchQuery, part) {
    const matchingSections = [];
    const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2); // Split query into terms

    function searchInNode(node) {
        if (node.type === 'section' && node.identifier && node.identifier.startsWith(`${part}.`)) {
            const label = (node.label || '').toLowerCase();
            const description = (node.label_description || '').toLowerCase();

            // Check if search terms match
            const matchScore = searchTerms.reduce((score, term) => {
                if (label.includes(term) || description.includes(term)) {
                    return score + 1;
                }
                return score;
            }, 0);

            if (matchScore > 0) {
                matchingSections.push({
                    identifier: node.identifier,
                    label: node.label,
                    description: node.label_description,
                    matchScore: matchScore
                });
            }
        }

        if (node.children) {
            node.children.forEach(child => searchInNode(child));
        }
    }

    // Start search from the root
    searchInNode(data);
    return matchingSections;
}

/**
 * Extracts and formats plain text from the structured eCFR content response.
 */
function extractTextFromContent(content) {
    // If content is an object, traverse it (for JSON structure API)
    if (typeof content === 'object' && content !== null) {
        let extractedText = '';

        function traverse(node) {
            if (!node) return;

            // Extract text from the current node if it's a string
            if (typeof node === 'string') {
                extractedText += node + ' ';
            }
    
            // If the node has a 'text' property, use it
            if (node.text) {
                extractedText += node.text + ' ';
            }
            
            // If the node has a 'title' property, use it
            if(node.title) {
                extractedText += node.title + ' ';
            }
    
            // Recursively traverse children if they exist
            if (Array.isArray(node.children)) {
                node.children.forEach(traverse);
            } else if (typeof node === 'object') {
                // Traverse through object properties if it's not an array
                Object.values(node).forEach(value => {
                    if (typeof value === 'object' || Array.isArray(value)) {
                        traverse(value);
                    }
                });
            }
        }
        traverse(content);
        return extractedText.replace(/\s+/g, ' ').trim();
    }
    
    // If content is a string, assume it's XML and strip tags
    if (typeof content === 'string') {
        return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    return '';
}

/**
 * Make HTTPS request and return parsed JSON or raw XML
 */
function makeHttpsRequest(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'VA-Disability-Assistant/1.0'
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Request failed with status code: ${res.statusCode}`));
            }

            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });

            res.on('end', () => {
                if (!rawData) {
                    return reject(new Error('Empty response from API'));
                }
                
                // If it's an XML request, return raw text. Otherwise parse JSON.
                if (parsedUrl.pathname.endsWith('.xml')) {
                    resolve(rawData);
                    return;
                }

                try {
                    const parsedData = JSON.parse(rawData);
                    resolve(parsedData);
                } catch (e) {
                    reject(new Error(`Failed to parse JSON response: ${e.message}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`HTTPS request failed: ${e.message}`));
        });

        req.end();
    });
}

/**
 * Format response for Bedrock Agent
 */
function formatResponse(functionName, responseText) {
    return {
        messageVersion: "1.0",
        response: {
            actionGroup: "eCFRActionGroup",
            function: functionName,
            functionResponse: {
                responseBody: {
                    "TEXT": {
                        "body": responseText,
                        "contentType": "text/html"
                    }
                }
            }
        }
    };
}

/**
 * Function to hyperlink URLs in the response text
 */
function hyperlinkUrls(text) {
    console.log("Original text:", text);
    
    // More comprehensive URL regex that handles various URL formats
    const urlRegex = /(?:(?:https?:\/\/)|(?:www\.))(?:[-\w.])+(?:\.[a-zA-Z]{2,3}|:[0-9]{1,5})(?:\/[^\s]*)?/g;
    
    const result = text.replace(urlRegex, (url) => {
        let href = url;
        let displayUrl = url;

        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            href = 'https://' + url;
        }

        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; cursor: pointer;">${displayUrl}</a>`;
    });
    
    console.log("Transformed text:", result);
    return result;
}

/**
 * Get body system specific search terms
 */
function getBodySystemTerms(bodySystem) {
    const systemMap = {
        'mental': ['mental', 'psychiatric', 'ptsd', 'post-traumatic', 'anxiety', 'depression', 'mood', 'psychosis', 'neurosis'],
        'cardiovascular': ['heart', 'cardiac', 'cardiovascular', 'circulatory', 'blood', 'artery', 'vein'],
        'respiratory': ['lung', 'respiratory', 'breathing', 'pulmonary', 'asthma', 'emphysema'],
        'musculoskeletal': ['muscle', 'bone', 'joint', 'spine', 'back', 'knee', 'shoulder', 'arm', 'leg', 'musculoskeletal'],
        'digestive': ['stomach', 'intestine', 'liver', 'gallbladder', 'pancreas', 'digestive', 'gastrointestinal'],
        'nervous': ['brain', 'nervous', 'neurological', 'seizure', 'stroke', 'paralysis', 'neuropathy'],
        'endocrine': ['diabetes', 'thyroid', 'hormone', 'endocrine', 'metabolic'],
        'skin': ['skin', 'dermatological', 'dermatitis', 'eczema', 'psoriasis'],
        'genitourinary': ['kidney', 'bladder', 'urinary', 'genital', 'reproductive'],
        'hearing': ['ear', 'hearing', 'deafness', 'tinnitus', 'auditory'],
        'vision': ['eye', 'vision', 'blindness', 'visual', 'ocular'],
        'immune': ['immune', 'autoimmune', 'allergy', 'lupus', 'rheumatoid']
    };
    
    const normalizedSystem = bodySystem.toLowerCase();
    return systemMap[normalizedSystem] || [];
}

/**
 * Get common medical condition categories based on condition keywords
 */
function getCommonMedicalCategories(condition) {
    const conditionLower = condition.toLowerCase();
    const categories = [];
    
    // Pain-related conditions
    if (conditionLower.includes('pain') || conditionLower.includes('ache') || conditionLower.includes('sore')) {
        categories.push('pain', 'musculoskeletal', 'joint');
    }
    
    // Injury-related conditions
    if (conditionLower.includes('injury') || conditionLower.includes('trauma') || conditionLower.includes('fracture') || 
        conditionLower.includes('sprain') || conditionLower.includes('strain')) {
        categories.push('musculoskeletal', 'bone', 'joint');
    }
    
    // Infection-related conditions
    if (conditionLower.includes('infection') || conditionLower.includes('bacterial') || conditionLower.includes('viral') ||
        conditionLower.includes('fungal')) {
        categories.push('infection', 'immune');
    }
    
    // Cancer-related conditions
    if (conditionLower.includes('cancer') || conditionLower.includes('tumor') || conditionLower.includes('malignant') ||
        conditionLower.includes('carcinoma') || conditionLower.includes('sarcoma')) {
        categories.push('cancer', 'neoplasm');
    }
    
    // Chronic conditions
    if (conditionLower.includes('chronic') || conditionLower.includes('degenerative') || conditionLower.includes('progressive')) {
        categories.push('chronic', 'degenerative');
    }
    
    // If no specific categories found, return general terms
    if (categories.length === 0) {
        categories.push('general', 'unspecified');
    }
    
    return categories;
}

/**
 * Get anatomical terms that might be related to the condition
 */
function getAnatomicalTerms(condition) {
    const conditionLower = condition.toLowerCase();
    const terms = [];
    
    // Extract potential body parts from condition name
    const bodyParts = [
        'head', 'neck', 'shoulder', 'arm', 'hand', 'finger', 'chest', 'back', 'spine',
        'hip', 'leg', 'knee', 'foot', 'toe', 'eye', 'ear', 'nose', 'throat', 'heart',
        'lung', 'stomach', 'liver', 'kidney', 'bladder', 'brain', 'nerve', 'muscle',
        'bone', 'joint', 'skin', 'blood'
    ];
    
    for (const part of bodyParts) {
        if (conditionLower.includes(part)) {
            terms.push(part);
        }
    }
    
    // If no specific body parts found, try broader anatomical systems
    if (terms.length === 0) {
        if (conditionLower.includes('mental') || conditionLower.includes('psych') || 
            conditionLower.includes('ptsd') || conditionLower.includes('anxiety') ||
            conditionLower.includes('depression')) {
            terms.push('mental', 'psychiatric');
        } else if (conditionLower.includes('heart') || conditionLower.includes('cardiac') ||
                   conditionLower.includes('blood') || conditionLower.includes('circulation')) {
            terms.push('cardiovascular', 'heart');
        } else if (conditionLower.includes('lung') || conditionLower.includes('breathing') ||
                   conditionLower.includes('respiratory')) {
            terms.push('respiratory', 'lung');
        } else if (conditionLower.includes('muscle') || conditionLower.includes('bone') ||
                   conditionLower.includes('joint') || conditionLower.includes('spine')) {
            terms.push('musculoskeletal', 'muscle', 'bone');
        }
    }
    
    return terms;
}
