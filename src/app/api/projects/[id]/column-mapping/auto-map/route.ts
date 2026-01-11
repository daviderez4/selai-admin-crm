import { NextRequest, NextResponse } from 'next/server';
import type { SourceColumn, ColumnMapping, MappingSuggestion } from '@/types/column-mapping';
import { findMatchingFields } from '@/types/column-mapping';

interface AutoMapRequestBody {
  sourceColumns: SourceColumn[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body: AutoMapRequestBody = await request.json();
    const { sourceColumns } = body;

    if (!sourceColumns || sourceColumns.length === 0) {
      return NextResponse.json(
        { error: 'Missing source columns' },
        { status: 400 }
      );
    }

    // Use local matching (AI can be added later with optional openai package)
    const localMappings = localAutoMap(sourceColumns);

    const unmapped = sourceColumns
      .filter(col => !localMappings.find(m => m.sourceColumn === col.name))
      .map(col => col.name);

    return NextResponse.json({
      mappings: localMappings,
      suggestions: localMappings.map(m => ({
        mapping: m,
        confidence: m.confidence || 70,
        reason: 'מיפוי אוטומטי על פי מילות מפתח',
      })),
      unmapped,
    });
  } catch (error) {
    console.error('Auto-map error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-map columns' },
      { status: 500 }
    );
  }
}

/**
 * Local automatic mapping based on keyword matching
 */
function localAutoMap(sourceColumns: SourceColumn[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];

  sourceColumns.forEach(col => {
    const matches = findMatchingFields(col.name);

    if (matches.length > 0) {
      const bestMatch = matches[0];
      const exactMatch =
        bestMatch.label.toLowerCase() === col.name.toLowerCase() ||
        bestMatch.id === col.name.toLowerCase() ||
        bestMatch.keywords.some(
          kw => kw.toLowerCase() === col.name.toLowerCase().replace(/_/g, '')
        );

      // Only auto-map with high confidence
      if (exactMatch) {
        mappings.push({
          sourceColumn: col.name,
          targetField: bestMatch.id,
          confirmed: false,
          confidence: 90,
        });
      } else {
        // Medium confidence - suggest but don't confirm
        const partialMatch = bestMatch.keywords.some(kw =>
          col.name.toLowerCase().includes(kw.toLowerCase()) ||
          kw.toLowerCase().includes(col.name.toLowerCase())
        );

        if (partialMatch) {
          mappings.push({
            sourceColumn: col.name,
            targetField: bestMatch.id,
            confirmed: false,
            confidence: 70,
          });
        }
      }
    }
  });

  return mappings;
}
