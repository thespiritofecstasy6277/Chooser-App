import { useState } from "react";
import { ChevronRight, Hand, Palette } from "lucide-react";
import { MODE_INFO, useSettings, type ChooserMode } from "../context/SettingsContext";
import { canVibrate } from "../utils/feedback";
import { TonePicker } from "./TonePicker";
import { Card, Row, Segmented, Toggle } from "./ui";
import { ThemeSettingsPanel } from "./ThemePickers";

export function ChooserOptions({ showMode = true }: { showMode?: boolean }) {
  const { settings, update } = useSettings();
  const notificationsSupported = "Notification" in window;
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<"themes" | "finger" | null>(null);

  const setNotification = async (enabled: boolean) => {
    if (!enabled) {
      update("notifications", false);
      return;
    }
    if (!notificationsSupported) return;
    try {
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      update("notifications", permission === "granted");
      setNotificationError(
        permission === "denied" ? "Allow notifications in browser settings to enable this." : null,
      );
    } catch (error) {
      console.error("Unable to request notification permission.", error);
      setNotificationError("Unable to request notification permission in this browser.");
    }
  };

  const toggleMode = (mode: ChooserMode, enabled: boolean) => {
    if (enabled) update("mode", mode);
    else if (settings.mode === mode) update("mode", "all");
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/85">
        <div className="divide-y divide-white/25">
          {showMode && (
            <Row label="Mode" hint={MODE_INFO[settings.mode].description}>
              <Segmented<ChooserMode>
                value={settings.mode}
                onChange={(v) => update("mode", v)}
                options={[
                  { value: "all", label: "All" },
                  { value: "teams", label: "Teams" },
                  { value: "order", label: "Order" },
                ]}
                className="w-[200px]"
              />
            </Row>
          )}
          <Row label="Countdown" hint="Hold your fingers this long">
            <Segmented<2 | 3 | 5>
              value={settings.countdown}
              onChange={(v) => update("countdown", v)}
              options={[
                { value: 2, label: "2s" },
                { value: 3, label: "3s" },
                { value: 5, label: "5s" },
              ]}
              className="w-[160px]"
            />
          </Row>
          {settings.mode === "all" && (
            <>
              <Row
                label="Winners"
                hint="Number of players must be greater than selected winners"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Remove one winner"
                    disabled={settings.winners <= 1}
                    onClick={() => update("winners", Math.max(1, settings.winners - 1))}
                    className="h-8 w-8 rounded-full bg-black/10 text-lg font-bold text-label disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="min-w-4 text-center font-semibold text-label">
                    {settings.winners}
                  </span>
                  <button
                    type="button"
                    aria-label="Add one winner"
                    disabled={settings.winners >= 12}
                    onClick={() => update("winners", Math.min(12, settings.winners + 1))}
                    className="h-8 w-8 rounded-full bg-[#ff8a1c] text-lg font-bold text-white disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </Row>
              <Row label="Rank winners" hint="Show each selected winner's rank">
                <Toggle
                  checked={settings.rankWinners}
                  onChange={(v) => update("rankWinners", v)}
                  label="Rank winners"
                />
              </Row>
            </>
          )}
          <Row label="Rank order" hint="Give every player a random turn">
            <Toggle
              checked={settings.mode === "order"}
              onChange={(v) => toggleMode("order", v)}
              label="Rank order"
            />
          </Row>
          <Row label="Homogeneous teams" hint="Split players into evenly sized teams">
            <Toggle
              checked={settings.homogeneousTeams}
              onChange={(v) => {
                update("homogeneousTeams", v);
                toggleMode("teams", v);
              }}
              label="Homogeneous teams"
            />
          </Row>
          <Row label="Take a Dare" hint="Give the selected player a dare">
            <Toggle
              checked={settings.takeDare}
              onChange={(v) => update("takeDare", v)}
              label="Take a Dare"
            />
          </Row>
          <Row label="Truth or Dare" hint="Give the selected player a random prompt">
            <Toggle
              checked={settings.truthOrDare}
              onChange={(v) => update("truthOrDare", v)}
              label="Truth or Dare"
            />
          </Row>
          {(settings.takeDare || settings.truthOrDare) && (
            <Row
              label="Explicit prompts (18+)"
              hint="Enables adult prompts from the shared feed. Only use with adults; every player can pass."
            >
              <Toggle
                checked={settings.adultPrompts}
                onChange={(v) => update("adultPrompts", v)}
                label="Explicit prompts (18+)"
              />
            </Row>
          )}
          <Row
            label="Tap Mode"
            hint="Tap once per player, then start the draw. Supports up to 50 players, or 30 with ranked, order, or homogeneous-team results."
          >
            <Toggle
              checked={settings.tapMode}
              onChange={(v) => update("tapMode", v)}
              label="Tap Mode"
            />
          </Row>
          <Row label="Cheat Mode" hint="The first player to join is always picked">
            <Toggle
              checked={settings.cheatMode}
              onChange={(v) => update("cheatMode", v)}
              label="Cheat Mode"
            />
          </Row>
          {settings.mode === "teams" && (
            <Row label="Teams" hint="Number of groups">
              <Segmented<2 | 3 | 4>
                value={settings.teams}
                onChange={(v) => update("teams", v)}
                options={[
                  { value: 2, label: "2" },
                  { value: 3, label: "3" },
                  { value: 4, label: "4" },
                ]}
                className="w-[156px]"
              />
            </Row>
          )}
        </div>
      </Card>

      <Card className="bg-white/85">
        <div className="divide-y divide-white/25">
          <Row label="Sounds" hint="Chime when a choice is made">
            <Toggle checked={settings.sound} onChange={(v) => update("sound", v)} label="Sounds" />
          </Row>
          <Row
            label="Vibrations"
            hint={canVibrate ? "Buzz during the countdown" : "Not supported on this device"}
          >
            <Toggle
              checked={settings.vibration}
              onChange={(v) => update("vibration", v)}
              label="Vibrations"
            />
          </Row>
          <Row
            label="Notifications"
            hint={
              notificationError ??
              (notificationsSupported
                ? "Notify when players have been picked"
                : "Notifications are not supported in this browser")
            }
          >
            <Toggle
              checked={settings.notifications}
              onChange={(v) => void setNotification(v)}
              label="Notifications"
            />
          </Row>
          <div className={settings.sound ? undefined : "opacity-45"}>
            <TonePicker />
          </div>
        </div>
      </Card>
      <Card className="bg-white/85">
        <div className="divide-y divide-black/10">
          <button
            type="button"
            onClick={() => setOpenPicker("themes")}
            className="flex w-full items-center gap-4 px-5 py-4 text-left text-label"
          >
            <Palette size={20} className="text-label/60" />
            <span className="flex-1 text-[17px] font-medium">Themes</span>
            <ChevronRight size={20} className="text-label/45" />
          </button>
          <button
            type="button"
            onClick={() => setOpenPicker("finger")}
            className="flex w-full items-center gap-4 px-5 py-4 text-left text-label"
          >
            <Hand size={20} className="text-label/60" />
            <span className="flex-1 text-[17px] font-medium">Finger theme</span>
            <ChevronRight size={20} className="text-label/45" />
          </button>
        </div>
      </Card>
      {openPicker && (
        <ThemeSettingsPanel type={openPicker} onClose={() => setOpenPicker(null)} />
      )}
    </div>
  );
}
