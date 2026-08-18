import { AssetCard, COLOR, Legend, TooltipContent } from '@digital-twin/components';
import { GroupedInstruction, MaintenanceInstructionList } from '../../../components';
import { RenderMaintenanceSeverity } from '../../maintenance-order/components/maintenance-order-card';
import styles from './early-warning-diagnostic-legend.module.scss';
import { EarlyWarningCard } from './early-warning-list';

const mockEarlyWarningCardData = {
  id: 1,
  asset_name: 'VFCU-CLB-L1-03',
  model: 'PEFY-P63 VMA-E',
  severity: 'HIGH',
  current_issues: [{ code: '5301', name: 'ACCT Sensor Fault' }],
  timestamp: '2025-09-30T10:00:00',
};

const mockInstructions: GroupedInstruction[] = [
  {
    codeId: 1,
    codeName: '5301 – ACCT Sensor Fault',
    data: [
      {
        typeId: 1,
        typeName: 'Diagnosis',
        isValid: true,
        data: [
          {
            id: 1,
            name: 'Check ACCT sensor wiring',
            content: 'Inspect wiring connections',
            isUsingPdf: false,
            pdfUrl: null,
            pdfName: null,
            description: 'Check for loose or damaged connections',
            duration: 30,
            createdBy: 'System',
            createdAt: '2025-09-30T10:00:00Z',
            updatedAt: null,
            modelNames: ['PEFY-P63 VMA-E'],
            isOther: false,
            typeId: 1,
            codeId: 1,
            isValid: true,
          },
        ],
      },
      {
        typeId: 2,
        typeName: 'Repair',
        isValid: true,
        data: [
          {
            id: 2,
            name: 'Replace ACCT sensor',
            content: 'Replace faulty sensor',
            isUsingPdf: false,
            pdfUrl: null,
            pdfName: null,
            description: 'Replace the ACCT sensor if damaged',
            duration: 60,
            createdBy: 'System',
            createdAt: '2025-09-30T10:00:00Z',
            updatedAt: null,
            modelNames: ['PEFY-P63 VMA-E'],
            isOther: false,
            typeId: 2,
            codeId: 1,
            isValid: true,
          },
        ],
      },
    ],
  },
];

export const EarlyWarningDiagnosticLegend = () => {
  return (
    <Legend>
      <div className={styles.container}>
        {/* Section 1: Early Warning Card */}
        <div className={styles.section}>
          <div className={styles.cardContainer}>
            <EarlyWarningCard
              data={mockEarlyWarningCardData}
              isSelected={false}
              onSelect={() => {}}
              onShowAdditionalIssues={() => {}}
              wrapperStyle={{ width: 513.6, alignSelf: 'unset' }}
            />
          </div>
          <TooltipContent
            content="Equipment ID"
            position="bottom"
            size="large"
            style={{
              top: '180px',
              left: '330px',
            }}
          />
          <TooltipContent
            content="Early Warning Scenario"
            position="bottom"
            size="large"
            style={{
              top: '180px',
              left: '585px',
            }}
          />
          <TooltipContent
            content={
              <div className={styles.severityTooltip}>
                <p>Severity Type</p>
                <span>Consists of 4 severity levels:</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <RenderMaintenanceSeverity severity="CRITICAL" />
                  <span>Critical</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <RenderMaintenanceSeverity severity="HIGH" />
                  <span>High</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <RenderMaintenanceSeverity severity="MEDIUM" />
                  <span>Medium</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <RenderMaintenanceSeverity severity="LOW" />
                  <span>Low</span>
                </div>
              </div>
            }
            position="left"
            size="large"
            style={{
              top: '180px',
              right: '75px',
            }}
          />
          <TooltipContent
            content="Alarm Information"
            position="right"
            size="large"
            style={{
              top: '320px',
              left: '85px',
            }}
          />
        </div>

        {/* Section 2: Asset Card */}
        <div className={styles.section}>
          <div className={styles.assetCardContainer}>
            <AssetCard
              name="VFCU-CLB-L1-03"
              type="VRF Fan Coil Unit"
              model="PEFY-P63 VMA-E"
              status="UNPLANNED DOWN"
              statusStartTime={new Date('2025-09-30T08:37:00')}
              condition="CRITICAL"
              conditionStartTime="2025-09-30T08:37:00"
              warningCount={1}
              criticalCount={2}
              uptime={85}
              runningHours={999999}
              runningBadgePosition="right"
              variant="details"
              disableLink
              className={styles.assetCard}
              image=""
            />
          </div>
          <TooltipContent
            content="Equipment ID"
            position="bottom"
            size="large"
            style={{
              top: '150px',
              left: '310px',
            }}
          />
          <TooltipContent
            content="Equipment Status"
            position="bottom"
            size="large"
            style={{
              top: '150px',
              left: '630px',
            }}
          />
          <TooltipContent
            content="Running Hours"
            position="left"
            size="large"
            style={{
              top: '255px',
              right: '90px',
            }}
          />
          <TooltipContent
            content="Equipment Information"
            position="right"
            size="large"
            style={{
              top: '320px',
              left: '20px',
            }}
          />
          <TooltipContent
            content="Equipment Condition"
            position="top"
            size="large"
            style={{
              bottom: '145px',
              left: '570px',
            }}
          />
          <TooltipContent
            content="Uptime"
            position="left"
            size="large"
            style={{
              top: '350px',
              right: '175px',
            }}
          />
        </div>

        {/* Section 3: Maintenance Instruction */}
        <div className={styles.section}>
          <div className={styles.instructionContainer}>
            <MaintenanceInstructionList
              instructions={mockInstructions}
              otherInstructions={[]}
              hasOtherInstructions={true}
              onValidityChange={() => {}}
              estimatedTime={'5 hours'}
              showSaveBtn={false}
              onSave={() => {}}
              useDropdownAsValidityInput
              useIconForTitle
              isLegend={true}
            />
          </div>
          <TooltipContent
            content="Estimated Time"
            position="bottom"
            size="large"
            style={{
              top: '100px',
              left: '465px',
            }}
          />
          <TooltipContent
            content="Issue Tab"
            position="bottom"
            size="large"
            style={{
              top: '100px',
              left: '748px',
            }}
          />
          <TooltipContent
            content="Issue Code"
            position="right"
            size="large"
            style={{
              top: '240px',
              left: '10px',
            }}
          />
          <TooltipContent
            content="Instruction Type"
            position="top"
            size="large"
            style={{
              bottom: '140px',
              left: '130px',
            }}
          />
          <TooltipContent
            content="Maintenance Result"
            position="top"
            size="large"
            style={{
              bottom: '140px',
              left: '730px',
            }}
          />
        </div>
      </div>
    </Legend>
  );
};
