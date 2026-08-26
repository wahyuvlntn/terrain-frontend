import { Button, COLOR, Container, Legend, Search, TooltipContent } from '@digital-twin/components';
import { InformationCircle, ListAlt, Plus } from '@digital-twin/icons';
import { SwitchCalendarList } from '../maintenance-order';
import styles from './calendar-legend.module.scss';
import { MaintenanceOrderCard } from './maintenance-order-card';

export const ListLegend = () => {
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
              two_columns
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
              top: '220px',
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
              top: '210px',
              right: '100px',
            }}
          />
          <TooltipContent
            content={'Maintenance Type'}
            position="right"
            size="large"
            style={{
              top: '280px',
              left: '130px',
            }}
          />
          <TooltipContent
            content={'Order Information'}
            position="top"
            size="large"
            style={{
              bottom: '210px',
              left: '380px',
            }}
          />
          <TooltipContent
            content={'Technician'}
            position="top"
            size="large"
            style={{
              bottom: '210px',
              right: '350px',
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
            <Container
              title={'Maintenance Order List'}
              className={styles['maintenance-order-list']}
              icon={<ListAlt width={24} height={24} />}
              background="none"
              headerProps={{
                className: styles['header-1'],
              }}
              rightTopComponent={<InformationCircle />}
            >
              <div className={styles['maintenance-order-list']}>
                <div className={styles['header']}>
                  <Search
                    wrapperClassName={styles['search']}
                    placeholder="Search..."
                    background="dark"
                  />
                  <Button icon={<Plus width={20} height={20} />}>New Request</Button>
                </div>
              </div>
            </Container>
          </div>
          <TooltipContent
            content={'Information Description'}
            position="bottom"
            size="large"
            style={{
              top: '210px',
              left: '525px',
            }}
          />
          <TooltipContent
            content={'Create New Request'}
            position="left"
            size="large"
            style={{
              bottom: '285px',
              right: '120px',
            }}
          />
          <TooltipContent
            content={
              <div className={styles['severity-tooltip']}>
                <p>Search Order</p>
                <br />
                <span>Orders can be searched based</span>
                <br />
                <span> on the information listed.</span>
              </div>
            }
            position="right-start"
            size="large"
            style={{
              top: '320px',
              left: '120px',
            }}
          />
        </div>
        <div className={styles['section']}>
          <div style={{ width: '300px' }}>
            <SwitchCalendarList filterView={'list'} setFilterView={() => {}} />
          </div>
          <TooltipContent
            content={'Calendar View'}
            position="right"
            size="large"
            style={{
              top: '305px',
              left: '240px',
            }}
          />
          <TooltipContent
            content={'List View'}
            position="left"
            size="large"
            style={{
              top: '305px',
              right: '370px',
            }}
          />
        </div>
      </div>
    </Legend>
  );
};
