/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { createYouTrackClient } from '../src/api/youtrack';
import { collectRoadmap } from '../src/graph/collect';
import { projectRoadmap } from '../src/graph/filter';
import { layoutRoadmap } from '../src/graph/layout';

/**
 * Optional end-to-end check against a real YouTrack instance. Skipped unless
 * YT_URL, YT_TOKEN and YT_ISSUE are set, e.g.
 *   YT_URL=https://x.youtrack.cloud YT_TOKEN=perm-... YT_ISSUE=WMS-985 npm test -- --run tests/live.smoke.test.ts
 */
const url = process.env.YT_URL;
const token = process.env.YT_TOKEN;
const issue = process.env.YT_ISSUE;

describe.skipIf(!url || !token || !issue)('live smoke', () => {
  it('collects and lays out a real epic', async () => {
    const client = createYouTrackClient({ baseUrl: url!, token: token! });
    const roadmap = await collectRoadmap(issue!, client.fetchIssue, { baseUrl: url! });
    const projection = projectRoadmap(roadmap, { showResolved: false });
    const layout = layoutRoadmap(projection);

    const kinds: Record<string, number> = {};
    for (const n of roadmap.nodes.values()) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
    console.log(
      JSON.stringify(
        {
          nodes: roadmap.nodes.size,
          edges: roadmap.edges.length,
          orphans: roadmap.orphanIds,
          cycles: roadmap.cycles,
          truncated: roadmap.truncated,
          kinds,
          hiddenWhenUnresolvedOnly: projection.hiddenCount,
          positioned: layout.positions.size,
        },
        null,
        2,
      ),
    );

    expect(roadmap.rootId).toBe(issue);
    expect(roadmap.nodes.size).toBeGreaterThan(1);
    expect(layout.positions.size).toBe(projection.nodes.length);
  }, 60_000);
});
