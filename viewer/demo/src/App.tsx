import { DependencyGraph } from './DependencyGraph';
import { dependencyTree } from './data';

export default function App() {
    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid var(--color-border-default)',
                    background: 'var(--color-bg-secondary)',
                }}
            >
                <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                    Dependency Graph
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Tree-structured module dependency visualisation
                </p>
            </div>

            {/* Graph */}
            <div style={{ padding: '0' }}>
                <DependencyGraph nodes={dependencyTree} />
            </div>
        </div>
    );
}
