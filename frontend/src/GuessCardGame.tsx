import React, { useState, useEffect } from 'react';
import playersData from './players.json';

import epicImg from './assets/images/empty-epic.png';
import bigtimeImg from './assets/images/empty-bigtime.png';

export default function GuessCardGame() {
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [userGuess, setUserGuess] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [emptyCardImage, setEmptyCardImage] = useState<string>('');

  // صور الكروت الفاضية
  const emptyCardImages: any = {
    epic: epicImg,
    bigtime: bigtimeImg,
    showtime: epicImg, // Fallback to epic for now if showtime is missing
  };

  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    // 1. اختيار لاعب عشوائي
    const randomPlayer = playersData[Math.floor(Math.random() * playersData.length)];
    setCurrentPlayer(randomPlayer);
    setEmptyCardImage(emptyCardImages[randomPlayer.cardType] || emptyCardImages.epic);
    
    // 2. توليد بنك التلميحات
    const allHints = [
      `يلعب في مركز ${randomPlayer.position}.`,
      `التقييم الإجمالي (Overall Rating) للكارت هو ${randomPlayer.overallRating}.`,
      `ينتمي إلى فريق أو منتخب ${randomPlayer.team}.`,
      `نوع هذا الكارت هو ${randomPlayer.cardType.toUpperCase()}.`,
      `اسم اللاعب يبدأ بحرف "${randomPlayer.name.charAt(0).toUpperCase()}".`,
      `اسم اللاعب يتكون من ${randomPlayer.name.replace(/\s/g, '').length} حروف (بدون مسافات).`,
      `أحد أفضل اللاعبين في مركزه بتقييم يتخطى الـ ${randomPlayer.overallRating - 2}.`
    ];

    // 3. اختيار 4 تلميحات عشوائية
    const shuffledHints = allHints.sort(() => 0.5 - Math.random()).slice(0, 4);
    setHints(shuffledHints);
    
    setUserGuess('');
    setShowResult(false);
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (userGuess.toLowerCase().trim() === currentPlayer.name.toLowerCase()) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
    setShowResult(true);
  };

  if (!currentPlayer) return null;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-cairo" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white">خمن كارت</h1>
        <button className="bg-[#1f2937] hover:bg-[#374151] p-2 rounded-lg transition-colors">
          <svg className="w-6 h-6 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center p-4">
        {/* Card Placeholder */}
        <div className="relative mb-10 w-48 h-72 rounded-xl flex items-center justify-center
                        shadow-[0_0_30px_rgba(234,179,8,0.3)] border border-yellow-500/50 
                        bg-gradient-to-b from-[#1a1c29] to-[#0b0f19] overflow-hidden">
          
          <img src={emptyCardImage} alt="Empty Card" className="absolute inset-0 w-full h-full object-cover opacity-50" onError={(e) => (e.currentTarget.style.display = 'none')} />
          
          <span className="text-8xl font-black text-[#ef4444] drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] z-10">?</span>
        </div>

        {/* Hints Section */}
        <div className="w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-2xl p-6 mb-6">
          <h2 className="text-yellow-500 font-bold text-lg mb-4">تلميحات اللاعب:</h2>
          <div className="space-y-3">
            {hints.map((hint, index) => (
              <div key={index} className="bg-[#0b0f19] p-4 rounded-xl text-sm md:text-base font-semibold shadow-inner">
                {index + 1}. {hint}
              </div>
            ))}
          </div>
        </div>

        {/* Guess Input & Button */}
        {!showResult ? (
          <form onSubmit={handleGuess} className="w-full max-w-md flex gap-2">
            <input 
              type="text" 
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              placeholder="اكتب اسم اللاعب هنا..." 
              className="flex-1 bg-[#111827] border border-[#374151] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
              required
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold transition-colors">
              تأكيد
            </button>
          </form>
        ) : (
          <div className="w-full max-w-md text-center space-y-4">
            <div className={`p-4 rounded-xl font-bold text-lg ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isCorrect ? 'إجابة صحيحة! بطل 🏆' : `للأسف غلط! اللاعب هو: ${currentPlayer.name}`}
            </div>
            
            <div className="flex justify-center mb-4">
              <img src={currentPlayer.imageUrl} alt={currentPlayer.name} className="w-48 h-auto rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
            </div>

            <button onClick={startNewRound} className="bg-yellow-600 hover:bg-yellow-700 w-full py-3 rounded-xl font-bold transition-colors">
              العب جولة جديدة 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
