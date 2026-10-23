import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AppIconPicker } from "../components/AppIconPicker";
import { Card, Row, ScreenHeader } from "../components/ui";
import { useSettings } from "../context/SettingsContext";
import { canVibrate, feedback } from "../utils/feedback";
import { APP_THEMES } from "../utils/themes";
import { getAppIconDataUrl } from "../utils/appIcon";

export function SettingsScreen() {
  const { settings, reset } = useSettings();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const selectedIcon =
    APP_THEMES.find((theme) => theme.id === settings.appIcon) ?? APP_THEMES[0];

  return (
    <div className="scroll-y absolute inset-0">
      <ScreenHeader title="Settings" />
      <div className="space-y-6 px-6 pb-10">
        <div className="pt-1 text-center">
          <p className="text-lg font-extrabold tracking-tight text-white">CHOOSER</p>
          <span className="mx-auto mt-2 block h-px w-12 bg-white/70" aria-hidden="true" />
          <p className="mt-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/85">
            BY TRISHUL
          </p>
        </div>
        <section>
          <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-wider text-white/85 uppercase">
            Appearance
          </h2>
          <Card className="bg-white/85">
            <button
              type="button"
              onClick={() => {
                setIconPickerOpen(true);
                feedback.tap();
              }}
              className="flex w-full items-center gap-4 px-5 py-4 text-left text-label"
            >
              <img
                src={getAppIconDataUrl(selectedIcon.id)}
                alt=""
                className="h-11 w-11 rounded-xl shadow-sm"
              />
              <span className="flex-1 text-[17px] font-medium">App Icon</span>
              <span className="text-[16px] text-label/55">
                {selectedIcon.id === "liquid-cheese" ? "LiquidCheese" : selectedIcon.name}
              </span>
              <ChevronRight size={20} className="text-label/45" />
            </button>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-wider text-white/85 uppercase">
            How to play
          </h2>
          <Card className="bg-white/85 px-5 py-4">
            <ol className="space-y-2 text-[15px] leading-snug text-label">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                Everyone places a finger anywhere on the screen.
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>A ring appears under each finger and the
                phone starts to vibrate.
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                Hold still – after the countdown only one ring stays. That's the one who plays!
              </li>
            </ol>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-wider text-white/85 uppercase">
            About
          </h2>
          <Card className="bg-white/85">
            <div className="divide-y divide-white/25">
              <Row label="Version">
                <span className="text-[17px] text-label/70">1.0.0</span>
              </Row>
              <Row
                label="Vibration support"
                hint={canVibrate ? "Available on this device" : "Not available in this browser"}
              >
                <span className="text-xl">{canVibrate ? "✅" : "⚠️"}</span>
              </Row>
              <Row label="Install" hint="Open the browser menu → Add to Home screen for fullscreen" />
              <div className="px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    feedback.tap();
                  }}
                  className="w-full rounded-2xl bg-white/50 py-3 text-[16px] font-semibold text-[#c0392b] active:scale-[0.98]"
                >
                  Reset all settings
                </button>
              </div>
            </div>
          </Card>
        </section>

        <p className="pb-2 text-center text-[13px] text-white/70">A random finger selector</p>
      </div>
      {iconPickerOpen && <AppIconPicker onClose={() => setIconPickerOpen(false)} />}
    </div>
  );
}
