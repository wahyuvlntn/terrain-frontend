import { COLOR, Legend, TooltipContent } from '@digital-twin/components';

import styles from './calendar-legend.module.scss';
import { MaintenanceOrderCard } from './maintenance-order-card';

export const CalendarLegend = () => {
  return (
    <Legend>
      <div className={styles['container']}>
        <div className={styles['section']}>
          <div>
            <MaintenanceOrderCard
              id={0}
              name={'CM-12-25-015'}
              equipment_id={'VFCU-CLB-L1-03'}
              planned_start={'2025-09-27T07:00:00'}
              assignee={'Kevin Singh'}
              status={'REQUESTED'}
              severity={'HIGH'}
              priority={'HIGH'}
              is_corrective={true}
              from_system={false}
              selected={false}
              wrapperStyle={{
                height: '137px',
                width: '500px',
              }}
              handleClick={function (): void {
                throw new Error('Function not implemented.');
              }}
            />
          </div>
          <TooltipContent
            content={'Order ID'}
            position="bottom"
            size="large"
            style={{
              top: '210px',
              left: '400px',
            }}
          />
          <TooltipContent
            content={'Creator'}
            position="bottom"
            size="large"
            style={{
              top: '210px',
              left: '525px',
            }}
          />
          <TooltipContent
            content={'Order Status'}
            position="bottom"
            size="large"
            style={{
              top: '210px',
              right: '360px',
            }}
          />
          <TooltipContent
            content={
              <div className={styles['severity-tooltip']}>
                <p>Severity Type</p>
                <span>Consists of 4 severity levels:</span>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.conditionCriticalPrimary }}
                  >
                    !
                  </div>
                  <span>Critical</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityHigh }}
                  >
                    !
                  </div>
                  <span>High</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityMedium }}
                  >
                    !
                  </div>
                  <span>Medium</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.conditionNormalPrimary }}
                  >
                    !
                  </div>
                  <span>Low</span>
                </div>
              </div>
            }
            position="left"
            size="large"
            style={{
              top: '205px',
              right: '100px',
            }}
          />
          <TooltipContent
            content={'Maintenance Type'}
            position="right"
            size="large"
            style={{
              top: '270px',
              left: '130px',
            }}
          />
          <TooltipContent
            content={'Order Information'}
            position="top"
            size="large"
            style={{
              bottom: '200px',
              left: '380px',
            }}
          />
          <TooltipContent
            content={
              <div className={styles['severity-tooltip']}>
                <p>Order Priority Type</p>
                <span>Consists of 3 priority levels:</span>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityHigh }}
                  ></div>
                  <span>High</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityMedium }}
                  ></div>
                  <span>Medium</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.conditionNormalPrimary }}
                  ></div>
                  <span>Low</span>
                </div>
              </div>
            }
            position="right-start"
            size="large"
            style={{
              bottom: '160px',
              left: '90px',
            }}
          />
        </div>
        <div className={styles['section']}>
          <div>
            <MaintenanceOrderCard
              id={0}
              name={'CM-12-25-015'}
              equipment_id={'VFCU-CLB-L1-03'}
              planned_start={'2025-09-27T07:00:00'}
              assignee={'Kevin Singh'}
              status={'REQUESTED'}
              severity={'HIGH'}
              priority={'LOW'}
              is_corrective={true}
              from_system={false}
              simple={true}
              selected={false}
              time="07:00"
              maxWidthTitle="300px"
              wrapperStyle={{
                height: '60px',
                width: '400px',
              }}
              handleClick={function (): void {
                throw new Error('Function not implemented.');
              }}
            />
          </div>
          <TooltipContent
            content={'Maintenance Type'}
            position="bottom-end"
            size="large"
            style={{
              top: '240px',
              left: '245px',
            }}
          />
          <TooltipContent
            content={'Planned Time'}
            position="bottom"
            size="large"
            style={{
              top: '240px',
              right: '380px',
            }}
          />
          <TooltipContent
            content={
              <div className={styles['severity-tooltip']}>
                <p>Severity Type</p>
                <span>Consists of 4 severity levels:</span>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.conditionCriticalPrimary }}
                  >
                    !
                  </div>
                  <span>Critical</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityHigh }}
                  >
                    !
                  </div>
                  <span>High</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityMedium }}
                  >
                    !
                  </div>
                  <span>Medium</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.conditionNormalPrimary }}
                  >
                    !
                  </div>
                  <span>Low</span>
                </div>
              </div>
            }
            position="left"
            size="large"
            style={{
              top: '240px',
              right: '150px',
            }}
          />
          <TooltipContent
            content={
              <div className={styles['severity-tooltip']}>
                <p>Order Priority Type</p>
                <span>Consists of 3 priority levels:</span>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityHigh }}
                  ></div>
                  <span>High</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.severityMedium }}
                  ></div>
                  <span>Medium</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  <div
                    className={styles['maintenance-severity']}
                    style={{ background: COLOR.conditionNormalPrimary }}
                  ></div>
                  <span>Low</span>
                </div>
              </div>
            }
            position="right-start"
            size="large"
            style={{
              bottom: '190px',
              left: '140px',
            }}
          />
          <TooltipContent
            content={'Order ID'}
            position="top"
            size="large"
            style={{
              bottom: '230px',
              left: '480px',
            }}
          />
        </div>
      </div>
    </Legend>
  );
};
