import { useEffect, useState, type ReactNode } from "react";
import { ArrowArt, CoinArt, DiceArt, NumberArt } from "../components/GameArt";
import { Card, ScreenHeader } from "../components/ui";
import { ArrowGame } from "../games/ArrowGame";
import { CoinGame } from "../games/CoinGame";
import { DiceGame } from "../games/DiceGame";
import { NumberGame } from "../games/NumberGame";
import { feedback } from "../utils/feedback";

export type GameId = "arrow" | "number" | "coin" | "dice";

const GAMES: { id: GameId; title: string; description: string; art: ReactNode }[] = [
  {
    id: "arrow",
    title: "Arrow",
    description: "Tap with your friends and let the arrow randomly pick someone",
    art: <ArrowArt />,
  },
  {
    id: "number",
    title: "Number",
    description: "Set your range and amount and let the app generate numbers instantly",
    art: <NumberArt />,
  },
  {
    id: "coin",
    title: "Coin",
    description: "Flip it once and let luck decide for you",
    art: <CoinArt />,
  },
  {
    id: "dice",
    title: "Dice",
    description: "Shake the dice and see what number you get",
    art: <DiceArt />,
  },
];

export function GamesScreen({ onGameOpenChange }: { onGameOpenChange: (open: boolean) => void }) {
  const [game, setGame] = useState<GameId | null>(null);
  useEffect(() => {
    onGameOpenChange(game !== null);
  }, [game, onGameOpenChange]);

  const back = () => {
    setGame(null);
    feedback.tap();
  };

  if (game === "arrow") return <ArrowGame onBack={back} />;
  if (game === "number") return <NumberGame onBack={back} />;
  if (game === "coin") return <CoinGame onBack={back} />;
  if (game === "dice") return <DiceGame onBack={back} />;

  return (
    <div className="scroll-y absolute inset-0">
      <ScreenHeader title="Choose a game" />
      <div className="space-y-4 px-6 pb-8">
        {GAMES.map((g) => (
          <Card
            key={g.id}
            onClick={() => {
              setGame(g.id);
              feedback.tap();
            }}
            className="anim-fade-up flex items-center justify-between gap-4 px-6 py-6"
          >
            <div className="min-w-0">
              <h2 className="text-[21px] font-semibold text-label">{g.title}</h2>
              <p className="mt-1 text-[17px] leading-snug text-label/90">{g.description}</p>
            </div>
            <div className="flex h-[108px] w-[108px] shrink-0 items-center justify-center">
              {g.art}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
