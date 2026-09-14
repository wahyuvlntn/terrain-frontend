import { Button, InfoTooltip, LoadingCircle, Popup } from '@digital-twin/components';
import { FilePdf, Fullscreen, InstructionFill } from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import styles from '../ai-insights.module.scss';
import {
  assetTag,
  DOC_TYPE_LABEL,
  fmtDuration,
  fmtNum,
  fmtTime,
  isNotFound,
  SEVERITY_COLOR,
  timeAgo,
  useNow,
} from '../ai-insights.utils';
import {
  AI_INSIGHTS_POLL,
  AI_INSIGHTS_QUERY,
  Fault,
  getFault,
  InstructionSource,
} from '../api/ai-insights.api';
import { MarkdownView } from './markdown';
import type { PdfTarget } from './pdf-dialog';
import { Empty, Facts, JsonView, Pill } from './shared';

/** Number a source is cited with: its own `n`, else its position */
const sourceNumber = (s: InstructionSource, index: number) => s.n ?? index + 1;

const docTypeLabel = (t: string | null) =>
  t ? (DOC_TYPE_LABEL[t as keyof typeof DOC_TYPE_LABEL] ?? t) : null;

const INSTRUCTION_INFO =
  'Written by the AI assistant only from the cited documents of the library. Check it against the site safety procedures before work starts.';

/** The retrieved document chunks, numbered as the instruction cites them */
const SourceList = ({
  sources,
  ready,
  onOpen,
}: {
  sources: InstructionSource[];
  ready: boolean;
  onOpen: (target: PdfTarget) => void;
}) => (
  <ol className={styles.sources}>
    {sources.map((s, i) => {
      const n = sourceNumber(s, i);
      const uncited = !ready || s.cited === false;
      return (
        <li
          key={`${n}:${s.documentId ?? i}`}
          className={clsx(uncited && styles['sources__item--uncited'])}
        >
          <span className={styles.sources__n}>[{n}]</span>
          <div className={styles.sources__body}>
            <span className={styles.sources__title} title={s.title ?? undefined}>
              {s.title ?? `Document ${s.documentId ?? ''}`}
            </span>
            <span className={styles.muted}>
              {[
                docTypeLabel(s.docType),
                s.page ? `p. ${s.page}` : null,
                s.heading,
                ready && s.cited === false ? 'not cited' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {s.snippet ? (
              <q className={styles.sources__snippet} title={s.snippet}>
                {s.snippet}
              </q>
            ) : null}
          </div>
          {s.documentId ? (
            <Button
              type="button"
              color="default-secondary"
              icon={<FilePdf />}
              className={styles.iconButton}
              title="Open the PDF"
              aria-label={`Open source ${n} (PDF)`}
              onClick={() =>
                onOpen({
                  documentId: s.documentId as number,
                  title: s.title ?? `Source ${n}`,
                  page: s.page,
                })
              }
            />
          ) : null}
        </li>
      );
    })}
  </ol>
);

type FaultDetailProps = {
  faultId: number;
  /** the list row, shown until the detail has loaded */
  listed?: Fault;
  ruleName: (code: string) => string;
  onOpenSource: (target: PdfTarget) => void;
};

/**
 * A detected fault: when and how strong, and in tabs the maintenance instruction the assistant
 * wrote from the document library (full text in a popup), the rule's evidence and the cited
 * sources (open as PDF).
 */
export const FaultDetail = ({ faultId, listed, ruleName, onOpenSource }: FaultDetailProps) => {
  const now = useNow(30_000);
  const [tab, setTab] = useState('instruction');
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: AI_INSIGHTS_QUERY.fault(faultId),
    queryFn: () => getFault(faultId),
    placeholderData: () => listed,
    // the instruction is written in the background shortly after detection
    refetchInterval: (q) =>
      q.state.data?.instructionStatus === 'PENDING' ? 10_000 : AI_INSIGHTS_POLL.faults,
    meta: { toastId: 'aiInsightsFault' },
  });
  const fault = query.data?.id === faultId ? query.data : undefined;
  const sources = fault?.instructionSources ?? [];

  const openCitation = useCallback(
    (n: number) => {
      const s = sources.find((x, i) => sourceNumber(x, i) === n);
      if (s?.documentId) {
        onOpenSource({ documentId: s.documentId, title: s.title ?? `Source ${n}`, page: s.page });
      }
    },
    [sources, onOpenSource]
  );

  if (!fault) {
    return (
      <Empty>
        {!query.isError
          ? 'Loading…'
          : isNotFound(query.error)
            ? `Fault #${faultId} was not found`
            : 'This fault could not be loaded'}
      </Empty>
    );
  }

  const end = fault.endedAt ? Date.parse(fault.endedAt) : now;
  const detailLoaded = !query.isPlaceholderData;
  const ready = fault.instructionStatus === 'READY';
  const title = fault.ruleName ?? ruleName(fault.ruleCode);
  const cited = sources.filter((s) => s.cited !== false).length;

  return (
    <div className={styles.detail}>
      <div className={styles.detail__header}>
        <span className={styles.kicker}>
          {fault.ruleCode} · {assetTag(fault.assetAlias)}
          {fault.assetName ? ` · ${fault.assetName}` : ''}
        </span>
        <h3 title={title}>{title}</h3>
        <div className={styles.chips}>
          <Pill color={SEVERITY_COLOR[fault.severity]}>{fault.severity.toLowerCase()}</Pill>
          <Pill color={fault.status === 'ACTIVE' ? 'critical' : 'offline'}>
            {fault.status === 'ACTIVE' ? 'Active' : 'Cleared'}
          </Pill>
        </div>
        <p className={styles.detail__message} title={fault.message}>
          {fault.message}
        </p>
      </div>

      <Facts
        items={[
          { label: 'Detected', value: fmtTime(fault.startedAt, 'dd MMM HH:mm') },
          {
            label: fault.endedAt ? 'Cleared' : 'Last seen',
            value: fault.endedAt
              ? fmtTime(fault.endedAt, 'dd MMM HH:mm')
              : timeAgo(fault.lastSeenAt, now),
          },
          { label: 'Duration', value: fmtDuration(end - Date.parse(fault.startedAt)) },
          { label: 'Intensity', value: fmtNum(fault.intensityEstimate, 2) },
        ]}
      />

      <TabProvider value={tab} onChange={setTab} type="4" className={styles.detail__tabs}>
        <TabList className={styles.tabs__list}>
          <Tab value="instruction" label="Instruction" className={styles.tabs__tab} />
          <Tab value="evidence" label="Evidence" className={styles.tabs__tab} />
          <Tab
            value="sources"
            label={`Sources${sources.length ? ` (${sources.length})` : ''}`}
            className={styles.tabs__tab}
          />
        </TabList>

        <TabPanel value="instruction" className={styles.detail__panel}>
          {!detailLoaded ? (
            <Empty>Loading…</Empty>
          ) : ready && fault.instructionMd ? (
            <>
              <div className={styles.detail__toolbar}>
                <Pill color="secondary" title={INSTRUCTION_INFO}>
                  AI-written · verify with site SOPs
                </Pill>
                <span className={styles.muted}>
                  {fault.instructionAt ? timeAgo(fault.instructionAt, now) : ''}
                </span>
                <InfoTooltip title="Maintenance instruction" content={INSTRUCTION_INFO} />
                <Button
                  type="button"
                  color="default-secondary"
                  icon={<Fullscreen />}
                  onClick={() => setExpanded(true)}
                >
                  Expand
                </Button>
              </div>
              <MarkdownView onCite={openCitation}>{fault.instructionMd}</MarkdownView>
            </>
          ) : fault.instructionStatus === 'PENDING' ? (
            <div className={styles.progress} role="status">
              <LoadingCircle isLoading scale={0.4} />
              Writing the instruction…
            </div>
          ) : fault.instructionMd ? (
            // SKIPPED / FAILED: the reason is stored in place of the instruction
            <MarkdownView className={styles.muted}>{fault.instructionMd}</MarkdownView>
          ) : (
            <Empty>
              {fault.instructionStatus === 'FAILED'
                ? 'The instruction could not be written'
                : 'No instruction for this fault'}
            </Empty>
          )}
        </TabPanel>

        <TabPanel value="evidence" className={styles.detail__panel}>
          {fault.evidence !== null ? (
            <JsonView value={fault.evidence} />
          ) : (
            <Empty>No evidence recorded</Empty>
          )}
        </TabPanel>

        <TabPanel value="sources" className={styles.detail__panel}>
          {sources.length ? (
            <>
              <span className={styles.muted}>
                {ready ? `${cited} of ${sources.length} cited` : 'Retrieved, not used'}
              </span>
              <SourceList sources={sources} ready={ready} onOpen={onOpenSource} />
            </>
          ) : (
            <Empty>No sources</Empty>
          )}
        </TabPanel>
      </TabProvider>

      <Popup
        open={expanded}
        title={title}
        icon={<InstructionFill />}
        informationIcon={<InfoTooltip title="Maintenance instruction" content={INSTRUCTION_INFO} />}
        onClose={() => setExpanded(false)}
        variant="none"
        background="none"
        width="min(1000px, 90vw)"
      >
        <div className={styles.reading}>
          {fault.instructionMd ? (
            <MarkdownView onCite={openCitation}>{fault.instructionMd}</MarkdownView>
          ) : null}
          {sources.length ? (
            <>
              <h4 className={styles.subhead}>Sources</h4>
              <SourceList sources={sources} ready={ready} onOpen={onOpenSource} />
            </>
          ) : null}
        </div>
      </Popup>
    </div>
  );
};
