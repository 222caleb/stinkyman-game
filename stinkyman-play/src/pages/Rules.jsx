import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Rules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate(createPageUrl("MainMenu"))}
            variant="ghost"
            className="text-white hover:bg-white/10"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-white">How to Play</h1>
        </div>

        {/* Rules Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 space-y-6 text-white">
          <section>
            <h2 className="text-xl font-bold mb-3 text-yellow-300">🎯 Objective</h2>
            <p className="text-white/80 leading-relaxed">
              Be the first player to get rid of all your cards — hand, face-up, and face-down cards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-yellow-300">🃏 Setup</h2>
            <ul className="space-y-2 text-white/80">
              <li>• Each player gets 3 face-down cards, 3 face-up cards, and 3 cards in hand</li>
              <li>• At the start, you can swap cards between your hand and face-up cards</li>
              <li>• The remaining cards form the draw deck</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-yellow-300">🎮 Gameplay</h2>
            <ul className="space-y-2 text-white/80">
              <li>• Play cards equal to or higher than the top card on the pile</li>
              <li>• You can play multiple cards of the same rank at once</li>
              <li>• If you can't play, take the entire pile into your hand</li>
              <li>• Draw back up to 3 cards from the deck after each turn</li>
              <li>• Once your hand is empty, play from face-up cards, then face-down (blind)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-yellow-300">⭐ Special Cards</h2>
            <ul className="space-y-2 text-white/80">
              <li>• <strong className="text-yellow-300">2</strong> — Reset card, can be played on anything</li>
              <li>• <strong className="text-yellow-300">5</strong> — Reverse! Next play must be equal or lower</li>
              <li>• <strong className="text-yellow-300">10</strong> — Burns the pile (clears it)</li>
              <li>• <strong className="text-yellow-300">Four of a kind</strong> — Playing 4 of the same rank burns the pile</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-yellow-300">🏆 Winning</h2>
            <p className="text-white/80 leading-relaxed">
              The first player to play all their cards (hand, face-up, and face-down) wins!
            </p>
          </section>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Button
            onClick={() => navigate(createPageUrl("MainMenu"))}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold px-8 py-3 rounded-xl"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}