import { useMemo, type ReactElement } from 'react';
import type { TreeNode } from './data';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 40;
const COL_WIDTH = 20;
const NODE_R = 5;
const LEFT_PAD = 14; // padding before the first column

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatNode {
    id: string;
    label: string;
    description: string;
    column: number;
    parentId: string | null;
    /** true if this node started a new branch column (i.e. non-first child) */
    isNewBranch: boolean;
}

// ─── Column Assignment (git-style) ────────────────────────────────────────────
// First child inherits the parent's column.
// Every additional child gets a new, incrementing column.
// Result: total columns == number of leaf nodes.

function assignCols(
    node: TreeNode,
    col: number,
    isNewBranch: boolean,
    counter: { value: number },
    parentId: string | null,
    out: FlatNode[],
): void {
    out.push({ id: node.id, label: node.label, description: node.description, column: col, parentId, isNewBranch });
    if (node.children && node.children.length > 0) {
        node.children.forEach((child, i) => {
            if (i === 0) {
                assignCols(child, col, false, counter, node.id, out);
            } else {
                const newCol = counter.value++;
                assignCols(child, newCol, true, counter, node.id, out);
            }
        });
    }
}

function buildFlatNodes(roots: TreeNode[]): FlatNode[] {
    const out: FlatNode[] = [];
    const counter = { value: 1 }; // col 0 goes to first root
    roots.forEach((root, i) => {
        const col = i === 0 ? 0 : counter.value++;
        assignCols(root, col, i > 0, counter, null, out);
    });
    return out;
}

// ─── Lane Spans ───────────────────────────────────────────────────────────────
// Each column (lane) spans from an "openRow" to an "endRow".
// openRow: the row of the parent that branched into this column (or the
//          first node's row for root / first-child columns).
// endRow:  the row of the last node in this column.

interface LaneSpan {
    openY: number; // pixel y-start of the lane line
    endY: number;  // pixel y-end of the lane line
}

function curveHeight(dx: number) {
    return Math.max(ROW_HEIGHT, dx * 0.75);
}

function buildLaneSpans(flat: FlatNode[]): Map<number, LaneSpan> {
    const rowById = new Map<string, number>(flat.map((n, i) => [n.id, i]));
    const spans = new Map<number, LaneSpan>();

    flat.forEach((node, rowIdx) => {
        const span = spans.get(node.column);
        const nodeY = rowY(rowIdx);
        const endY = span ? Math.max(span.endY, nodeY) : nodeY;

        let openY: number;
        if (node.isNewBranch && node.parentId !== null) {
            const parentRowIdx = rowById.get(node.parentId) ?? rowIdx;
            const parentNode = flat[parentRowIdx];
            const dx = Math.abs(colX(node.column) - colX(parentNode.column));
            // Lane starts exactly where the S-curve ends
            openY = rowY(parentRowIdx) + curveHeight(dx);
        } else {
            openY = span ? Math.min(span.openY, nodeY) : nodeY;
        }

        spans.set(node.column, { openY, endY });
    });

    return spans;
}

// ─── SVG Connector Layer ──────────────────────────────────────────────────────

function colX(col: number) {
    return LEFT_PAD + col * COL_WIDTH;
}
function rowY(row: number) {
    return row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

interface ConnectorProps {
    flat: FlatNode[];
    laneSpans: Map<number, LaneSpan>;
    totalRows: number;
    svgWidth: number;
}

function ConnectorLayer({ flat, laneSpans, totalRows, svgWidth }: ConnectorProps) {
    const elems: ReactElement[] = [];
    const rowById = new Map<string, number>(flat.map((n, i) => [n.id, i]));

    // 1. Vertical lane lines (in pixel Y space)
    laneSpans.forEach((span, col) => {
        const x = colX(col);
        if (span.endY > span.openY) {
            elems.push(
                <line
                    key={`lane-${col}`}
                    x1={x} y1={span.openY}
                    x2={x} y2={span.endY}
                    stroke="var(--color-border-default)"
                    strokeWidth="1.5"
                />,
            );
        }
    });

    // 2. S-curve connectors for non-first-child branches.
    //    Cubic bezier with vertical tangents at both ends.
    //    Curve height scales with horizontal distance so farther branches
    //    get a taller, more relaxed arc instead of all cramming into one row.
    flat.forEach((node) => {
        if (!node.isNewBranch || !node.parentId) return;
        const parentRow = rowById.get(node.parentId);
        if (parentRow === undefined) return;

        const parentNode = flat[parentRow];
        const px = colX(parentNode.column);
        const py = rowY(parentRow);
        const cx = colX(node.column);
        const dx = Math.abs(cx - px);
        const curveH = curveHeight(dx);
        const endY = py + curveH;
        const midY = py + curveH / 2;
        // Cubic bezier: vertical tangents at start and end
        const d = `M ${px} ${py} C ${px} ${midY} ${cx} ${midY} ${cx} ${endY}`;
        elems.push(
            <path
                key={`scurve-${node.id}`}
                d={d}
                fill="none"
                stroke="var(--color-border-default)"
                strokeWidth="1.5"
            />,
        );
    });


    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: svgWidth,
                height: totalRows * ROW_HEIGHT,
                pointerEvents: 'none',
                zIndex: 1,
            }}
        >
            {elems}
        </svg>
    );
}

// ─── Single Row ───────────────────────────────────────────────────────────────

function GraphRow({ node, svgWidth }: { node: FlatNode; svgWidth: number }) {
    const cx = colX(node.column);
    const cy = ROW_HEIGHT / 2;

    return (
        <div
            className="graph-row"
            style={{
                display: 'flex',
                alignItems: 'center',
                height: ROW_HEIGHT,
                position: 'relative',
                borderBottom: '1px solid var(--color-border-muted)',
            }}
        >
            {/* Graph lane area */}
            <div style={{ position: 'relative', width: svgWidth, flexShrink: 0, height: '100%' }}>
                <svg
                    style={{ position: 'absolute', top: 0, left: 0, width: svgWidth, height: ROW_HEIGHT, pointerEvents: 'none' }}
                >
                    <circle
                        cx={cx} cy={cy} r={NODE_R}
                        fill="var(--color-bg-primary)"
                        stroke="var(--color-border-accent)"
                        strokeWidth="2"
                    />
                </svg>
            </div>

            {/* Label + description */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, paddingLeft: 10, paddingRight: 16, minWidth: 0 }}>
                <span style={{
                    display: 'inline-block',
                    padding: '1px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-border-accent)',
                    border: '1px solid var(--color-border-default)',
                    whiteSpace: 'nowrap',
                }}>
                    {node.label}
                </span>
                <span style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {node.description}
                </span>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DependencyGraph({ nodes }: { nodes: TreeNode[] }) {
    const flat = useMemo(() => buildFlatNodes(nodes), [nodes]);
    const laneSpans = useMemo(() => buildLaneSpans(flat), [flat]);
    const maxCol = useMemo(() => Math.max(...flat.map((n) => n.column), 0), [flat]);
    const svgWidth = LEFT_PAD * 2 + (maxCol + 1) * COL_WIDTH;

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <ConnectorLayer flat={flat} laneSpans={laneSpans} totalRows={flat.length} svgWidth={svgWidth} />
            {flat.map((node) => (
                <GraphRow key={node.id} node={node} svgWidth={svgWidth} />
            ))}
        </div>
    );
}
