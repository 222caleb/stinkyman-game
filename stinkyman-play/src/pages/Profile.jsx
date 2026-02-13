import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Trophy, Target } from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CARD_THEMES } from "@/components/game/CardThemes";
import Card from "@/components/game/Card";

const AVATARS = [
  { id: "knight", color: "from-red-600 to-red-800", icon: "⚔️" },
  { id: "wizard", color: "from-purple-600 to-purple-800", icon: "🔮" },
  { id: "dragon", color: "from-green-600 to-green-800", icon: "🐉" },
  { id: "crown", color: "from-yellow-600 to-yellow-800", icon: "👑" },
  { id: "shield", color: "from-blue-600 to-blue-800", icon: "🛡️" },
  { id: "fire", color: "from-orange-600 to-orange-800", icon: "🔥" },
  { id: "lightning", color: "from-cyan-600 to-cyan-800", icon: "⚡" },
  { id: "star", color: "from-pink-600 to-pink-800", icon: "⭐" },
  { id: "gem", color: "from-indigo-600 to-indigo-800", icon: "💎" },
  { id: "skull", color: "from-gray-600 to-gray-800", icon: "💀" },
  { id: "trophy", color: "from-amber-600 to-amber-800", icon: "🏆" },
  { id: "target", color: "from-red-500 to-rose-700", icon: "🎯" },
  { id: "rocket", color: "from-blue-500 to-sky-700", icon: "🚀" },
  { id: "ninja", color: "from-slate-600 to-slate-800", icon: "🥷" },
  { id: "robot", color: "from-teal-600 to-teal-800", icon: "🤖" },
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("knight");
  const [selectedTheme, setSelectedTheme] = useState("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setDisplayName(currentUser.displayName || "");
      setSelectedAvatar(currentUser.avatar || "knight");
      setSelectedTheme(currentUser.cardTheme || "classic");
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        displayName: displayName.trim(),
        avatar: selectedAvatar,
        cardTheme: selectedTheme,
      });
      toast.success("Profile updated!");
    } catch (error) {
      toast.error("Failed to save profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const winRate = user?.gamesPlayed > 0 
    ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 p-6">
      {/* Back Button */}
      <Button
        onClick={() => navigate(createPageUrl("MainMenu"))}
        variant="ghost"
        className="text-white hover:bg-white/10 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-white/20">
          <h1 className="text-3xl font-bold text-white mb-6">Profile</h1>

          {/* Avatar Selection */}
          <div className="mb-6">
            <label className="text-white/80 text-sm font-medium mb-2 block">
              Choose Avatar
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`relative p-3 rounded-xl transition-all overflow-hidden ${
                    selectedAvatar === avatar.id
                      ? "ring-2 ring-yellow-400 scale-110"
                      : "hover:scale-105"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${avatar.color} ${
                    selectedAvatar === avatar.id ? "opacity-100" : "opacity-60"
                  }`} />
                  <span className="relative text-3xl flex items-center justify-center">
                    {avatar.icon}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-6">
            <label className="text-white/80 text-sm font-medium mb-2 block">
              Display Name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          {/* Card Theme Selection */}
          <div className="mb-6">
            <label className="text-white/80 text-sm font-medium mb-2 block">
              Card Theme
            </label>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(CARD_THEMES).map(([key, theme]) => (
                <div key={key} className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setSelectedTheme(key)}
                    className={`relative transition-all ${
                      selectedTheme === key
                        ? "ring-2 ring-yellow-400 scale-110"
                        : "hover:scale-105"
                    }`}
                  >
                    <Card
                      card={{ rank: 14, suit: "hearts" }}
                      theme={key}
                      small
                      disabled
                      animate={false}
                    />
                  </button>
                  <span className="text-white/60 text-xs text-center">{theme.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-bold"
          >
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        {/* Stats Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Statistics
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Games Played */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{user?.gamesPlayed || 0}</p>
              <p className="text-white/60 text-sm">Games Played</p>
            </div>

            {/* Games Won */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{user?.gamesWon || 0}</p>
              <p className="text-white/60 text-sm">Games Won</p>
            </div>

            {/* Win Rate */}
            <div className="bg-white/5 rounded-xl p-4 text-center col-span-2">
              <div className="text-4xl font-bold text-green-400 mb-1">{winRate}%</div>
              <p className="text-white/60 text-sm">Win Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}