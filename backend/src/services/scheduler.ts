import { campaignService } from "./campaign.service";

const POLL_INTERVAL_MS = 30_000;

export function startCampaignScheduler(): () => void {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const dispatched = await campaignService.dispatchDue();
      if (dispatched > 0) {
        console.info(`Scheduler dispatched ${dispatched} campaign(s)`);
      }
    } catch (error) {
      console.error("Campaign scheduler failed", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, POLL_INTERVAL_MS);
  timer.unref();
  void tick();

  return () => clearInterval(timer);
}
