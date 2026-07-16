/**
 * Features — create_feature, get_feature (+ release_dispatch_hold), and
 * import_stories. There is no list-features query on the rails, so features are
 * created here (the new id is shown to copy) or inspected by id. Import takes
 * the stories.yaml CONTENT pasted into the textarea.
 */
import type { Feature } from '@oahs/core';

import { clear, el, run, setStatus } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import { navigate, type View } from '../core/router.js';
import { groupFeaturesByColumn, FEATURE_STAGE_LABEL } from '../core/feature-stages.js';
import { button, card, cardSub, cardTitle, field, section, textInput } from '../components/widgets.js';

interface StoriesImportResult {
  imported: string[];
  updated: string[];
  warnings: string[];
}

export const featuresView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    view.appendChild(el('h2', undefined, 'Features'));

    // -- board: features grouped by stage (§9.7 portal parity) ----------------
    const board = section('Board');
    const boardBody = el('div', 'feature-board');
    board.body.appendChild(boardBody);
    view.appendChild(board.section);
    run(async () => {
      const features = await rpc<Feature[]>('feature_list', {});
      clear(boardBody);
      for (const column of groupFeaturesByColumn(features)) {
        const col = el('div', 'board-col');
        col.appendChild(el('div', 'board-col-head', `${column.label} · ${String(column.features.length)}`));
        for (const feature of column.features) {
          const c = card('card board-card');
          c.appendChild(cardTitle(feature.name ?? feature.id));
          c.appendChild(cardSub(`${FEATURE_STAGE_LABEL[feature.state]}${feature.dispatchHold ? ' · hold' : ''}`));
          c.addEventListener('click', () => navigate(`feature/${feature.id}`));
          col.appendChild(c);
        }
        boardBody.appendChild(col);
      }
    });

    // -- create
    const create = section('Create feature');
    const createdList = el('div', 'section-body');
    create.body.appendChild(
      button(
        'Create feature',
        () => {
          run(async () => {
            const feature = await rpc<Feature>('create_feature', {});
            const line = card();
            line.appendChild(cardTitle(`feature ${feature.id}`));
            line.appendChild(cardSub(`state ${feature.state} · dispatchHold ${feature.dispatchHold}`));
            createdList.prepend(line);
          });
        },
        'primary',
      ),
    );
    create.body.appendChild(createdList);
    view.appendChild(create.section);

    // -- inspect + release hold
    const inspect = section('Inspect feature');
    const inspectId = textInput('featureId');
    const inspectOut = el('div', 'section-body');
    inspect.body.appendChild(field('Feature id', inspectId));
    inspect.body.appendChild(
      button('Load', () => {
        run(async () => {
          const featureId = inspectId.value.trim();
          if (featureId === '') throw new Error('featureId is required');
          const feature = await rpc<Feature>('get_feature', { featureId });
          clear(inspectOut);
          const line = card();
          line.appendChild(cardTitle(`feature ${feature.id}`));
          line.appendChild(cardSub(`state ${feature.state} · dispatchHold ${feature.dispatchHold}`));
          if (feature.dispatchHold) {
            const actions = el('div', 'c-actions');
            actions.appendChild(
              button('Release dispatch hold', () => {
                run(async () => {
                  await rpc('release_dispatch_hold', { featureId: feature.id });
                  setStatus(`dispatch hold released on ${feature.id}`);
                });
              }),
            );
            line.appendChild(actions);
          }
          inspectOut.appendChild(line);
        });
      }),
    );
    inspect.body.appendChild(inspectOut);
    view.appendChild(inspect.section);

    // -- import stories.yaml
    const importSection = section('Import stories.yaml');
    const importId = textInput('featureId');
    const yaml = el('textarea');
    yaml.placeholder = 'paste stories.yaml content here';
    yaml.rows = 8;
    const importOut = el('div', 'section-body');
    importSection.body.appendChild(field('Feature id', importId));
    importSection.body.appendChild(field('stories.yaml', yaml));
    importSection.body.appendChild(
      button(
        'Import',
        () => {
          run(async () => {
            const featureId = importId.value.trim();
            const content = yaml.value;
            if (featureId === '' || content.trim() === '') {
              throw new Error('featureId and stories.yaml content are required');
            }
            const result = await rpc<StoriesImportResult>('import_stories', { featureId, yaml: content });
            clear(importOut);
            const line = card();
            line.appendChild(cardTitle('Import result'));
            line.appendChild(
              cardSub(
                `imported ${result.imported.length} · updated ${result.updated.length} · warnings ${result.warnings.length}`,
              ),
            );
            if (result.warnings.length > 0) line.appendChild(cardSub(result.warnings.join(' · ')));
            importOut.appendChild(line);
          });
        },
        'primary',
      ),
    );
    importSection.body.appendChild(importOut);
    view.appendChild(importSection.section);

    container.appendChild(view);
    return () => {};
  },
};
