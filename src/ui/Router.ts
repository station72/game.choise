export type ScreenId =
  | "start"
  | "onboarding"
  | "animation"
  | "month"
  | "event"
  | "year_summary"
  | "ending";

type ScreenListener = (to: ScreenId, props?: unknown) => void;

export class Router {
  private current: ScreenId = "start";
  private history: ScreenId[] = [];
  private listeners: ScreenListener[] = [];

  navigate(to: ScreenId, props?: unknown): void {
    this.history.push(this.current);
    this.current = to;
    for (const listener of this.listeners) {
      listener(to, props);
    }
  }

  getCurrent(): ScreenId {
    return this.current;
  }

  on(listener: ScreenListener): void {
    this.listeners.push(listener);
  }

  off(listener: ScreenListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
}
