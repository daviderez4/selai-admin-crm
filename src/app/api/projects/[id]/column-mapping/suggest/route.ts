import { NextRequest, NextResponse } from 'next/server';
import type {
  SourceColumn,
  ColumnMapping,
  MappingSuggestion,
  MappingQueryResponse,
} from '@/types/column-mapping';
import { STANDARD_FIELDS, findMatchingFields } from '@/types/column-mapping';

interface SuggestRequestBody {
  query: string;
  sourceColumns: SourceColumn[];
  currentMappings: ColumnMapping[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body: SuggestRequestBody = await request.json();
    const { query, sourceColumns, currentMappings } = body;

    if (!query || !sourceColumns) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use local matching (AI can be added later with optional openai package)
    const response = localSuggestMappings(query, sourceColumns, currentMappings);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Column mapping suggestion error:', error);

    // Fallback to local matching
    const body = await request.clone().json();
    const fallbackResponse = localSuggestMappings(
      body.query,
      body.sourceColumns,
      body.currentMappings
    );

    return NextResponse.json(fallbackResponse);
  }
}

/**
 * Local fallback for mapping suggestions without AI
 */
function localSuggestMappings(
  query: string,
  sourceColumns: SourceColumn[],
  currentMappings: ColumnMapping[]
): MappingQueryResponse {
  const suggestions: MappingSuggestion[] = [];
  const queryLower = query.toLowerCase();

  // Extract potential column mentions from query
  const mentionedColumns = sourceColumns.filter(col =>
    queryLower.includes(col.name.toLowerCase())
  );

  // Extract potential field mentions from query
  const mentionedFields = STANDARD_FIELDS.filter(
    field =>
      queryLower.includes(field.label.toLowerCase()) ||
      queryLower.includes(field.id) ||
      field.keywords.some(kw => queryLower.includes(kw.toLowerCase()))
  );

  // Try to match mentioned columns to mentioned fields
  if (mentionedColumns.length > 0 && mentionedFields.length > 0) {
    mentionedColumns.forEach(col => {
      const matchedField = mentionedFields[0];
      if (matchedField) {
        suggestions.push({
          mapping: {
            sourceColumn: col.name,
            targetField: matchedField.id,
            confirmed: false,
            confidence: 75,
          },
          confidence: 75,
          reason: `העמודה "${col.name}" התאימה לשדה "${matchedField.label}" על פי הבקשה`,
        });
      }
    });
  }

  // If no explicit matches, try automatic matching for all columns
  if (suggestions.length === 0) {
    sourceColumns.forEach(col => {
      // Skip already mapped columns
      if (currentMappings.some(m => m.sourceColumn === col.name)) return;

      const matches = findMatchingFields(col.name);
      if (matches.length > 0) {
        const bestMatch = matches[0];
        const exactMatch =
          bestMatch.label.toLowerCase() === col.name.toLowerCase() ||
          bestMatch.keywords.some(kw => kw.toLowerCase() === col.name.toLowerCase());

        suggestions.push({
          mapping: {
            sourceColumn: col.name,
            targetField: bestMatch.id,
            confirmed: false,
            confidence: exactMatch ? 90 : 65,
          },
          confidence: exactMatch ? 90 : 65,
          reason: exactMatch
            ? `התאמה מדויקת לשדה "${bestMatch.label}"`
            : `התאמה חלקית לשדה "${bestMatch.label}" על פי מילות מפתח`,
          alternatives: matches.slice(1, 3).map(m => ({
            targetField: m.id,
            confidence: 50,
            reason: `התאמה אפשרית: ${m.label}`,
          })),
        });
      }
    });
  }

  return {
    understood: true,
    suggestions,
    message:
      suggestions.length > 0
        ? `נמצאו ${suggestions.length} התאמות אפשריות`
        : 'לא נמצאו התאמות. נסה לתאר יותר ספציפית אילו עמודות רוצים למפות.',
  };
}
