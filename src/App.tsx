import { useEffect, useState } from "react";
import { TabBar, type Tab } from "./components/TabBar";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ChooserScreen } from "./screens/ChooserScreen";
import { GamesScreen } from "./screens/GamesScreen";
import { RouletteScreen } from "./screens/RouletteScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { APP_THEMES } from "./utils/themes";
import { applyAppIcon } from "./utils/appIcon";

function AppContent() {
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>("chooser");
  const [gameOpen, setGameOpen] = useState(false);
  useEffect(() => {
    applyAppIcon(settings.appIcon);
  }, [settings.appIcon]);
  const theme = APP_THEMES.find((item) => item.id === settings.theme) ?? APP_THEMES[0];
  const background =
    settings.theme === "custom" && settings.customThemeImage
      ? `url("${settings.customThemeImage}") center / cover no-repeat`
      : theme.background;

  if (window.location.pathname === "/admin") return <AdminScreen />;

  return (
    <div className="flex h-full w-full justify-center bg-[#140509]">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col overflow-hidden text-white shadow-2xl"
        style={{ background }}
      >
        <main className="relative min-h-0 flex-1">
          {tab === "chooser" && <ChooserScreen />}
          {tab === "roulette" && <RouletteScreen />}
          {tab === "games" && <GamesScreen onGameOpenChange={setGameOpen} />}
          {tab === "settings" && <SettingsScreen />}
        </main>
        {!gameOpen && <TabBar active={tab} onChange={setTab} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
