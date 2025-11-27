import { MicroDaoCabinetPage } from './MicroDaoCabinetPage';
import { DaarionMonitorChat } from '../components/monitor/DaarionMonitorChat';

// DAARION DAO - перша мікроДАО
const DAARION_MICRODAO_ID = 'daarion-dao';

export function DaarionCabinetPage() {
  return (
    <>
      <MicroDaoCabinetPage microDaoId={DAARION_MICRODAO_ID} />
      <DaarionMonitorChat />
    </>
  );
}

