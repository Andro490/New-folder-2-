const fs = require('fs');

const path = 'c:\\Users\\SMART\\Desktop\\New folder (2)\\mobile\\src\\app\\online-auction.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add backupPlayers to buildGameData
code = code.replace(
  '  return { list, formation };\n}',
  `
  const backupPlayers: any = {};
  const backupPool = [...playersData].filter(p => !usedIds.has(p.id));
  backupPool.forEach(p => {
    if (!backupPlayers[p.position]) backupPlayers[p.position] = [];
    backupPlayers[p.position].push({ name: p.name, rating: p.overallRating, flag: p.team, position: p.position, imageUrl: p.imageUrl });
  });

  ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'].forEach(pos => {
    if (!backupPlayers[pos] || backupPlayers[pos].length === 0) backupPlayers[pos] = [{ name: 'Backup', rating: 80, flag: 'Unknown', position: pos }];
  });

  return { list, formation, backupPlayers };
}`
);

// 2. Add state
code = code.replace(
  '  const bidPulse = useRef(new Animated.Value(1)).current;',
  `  const bidPulse = useRef(new Animated.Value(1)).current;
  const resCard1Anim = useRef(new Animated.Value(height)).current;
  const resCard2Anim = useRef(new Animated.Value(height)).current;
  const [auctionResultInfo, setAuctionResultInfo] = useState<any>(null);
  const [backupPlayersData, setBackupPlayersData] = useState<any>({});`
);

// 3. Update bot initialization to save backupPlayersData
code = code.replace(
  '    const { list, formation: f } = buildGameData(seed, isClassic);',
  `    const { list, formation: f, backupPlayers } = buildGameData(seed, isClassic);
    setBackupPlayersData(backupPlayers);`
);
code = code.replace(
  '    setPlayers(list);',
  `    setPlayers(list);`
);

// 4. Update Firebase initialization for Player1
code = code.replace(
  '      "game/players": list, "game/formation": f,',
  `      "game/players": list, "game/formation": f, "game/backupPlayersData": backupPlayers,`
);

// 5. Update Firebase listener to read backupPlayersData and lastResult
code = code.replace(
  '      setMyBidAttempt((roomData.game.currentBid ?? 5) + BID_STEP);\n    }',
  `      setMyBidAttempt((roomData.game.currentBid ?? 5) + BID_STEP);
    }
    if (roomData?.game?.backupPlayersData) {
      setBackupPlayersData(roomData.game.backupPlayersData);
    }
    if (roomData?.game?.lastResult && roomData.game.phase === "result") {
       setAuctionResultInfo(roomData.game.lastResult);
       if (roomData.game.lastResult.winner === uid) {
          setResultWinner("me");
       } else if (roomData.game.lastResult.winner) {
          setResultWinner("opp");
       } else {
          setResultWinner(null);
       }
       triggerResultAnimation();
    }`
);

// 6. triggerResultAnimation helper
code = code.replace(
  '  // ── helper: الانتقال للكارت التالي ────────────────────────────',
  `  function triggerResultAnimation() {
    resCard1Anim.setValue(height);
    resCard2Anim.setValue(height);
    Animated.sequence([
      Animated.timing(resCard1Anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(resCard2Anim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  // ── helper: الانتقال للكارت التالي ────────────────────────────`
);

// 7. Replace botPass logic
code = code.replace(
  `  // ── Bot pass ──────────────────────────────────────────────────
  function botPass() {
    if (lastRaiser === uid) {
      setResultWinner("me");
      setMyTeam(prev => { const n = [...prev]; n[playerIdx] = currentPlayer?.name; return n; });
      setMyBudget(b => b - currentBid);
      setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
    } else {
      setResultWinner(null);
      setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
      setMyTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
    }
    setPhase("result");
    setTimeout(() => {
      setPhase("bid");
      setResultWinner(null);
      goNext(playerIdx + 1, true);
    }, 1500);
  }`,
  `  // ── Bot pass ──────────────────────────────────────────────────
  function botPass() {
    const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"];
    if (lastRaiser === uid) {
      const randomOpp = backups[Math.floor(Math.random() * backups.length)];
      setResultWinner("me");
      setAuctionResultInfo({ mainPlayer: currentPlayer, backupPlayer: randomOpp, winner: uid });
      setMyTeam(prev => { const n = [...prev]; n[playerIdx] = currentPlayer?.name; return n; });
      setMyBudget(b => b - currentBid);
      setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = randomOpp.name; return n; });
    } else {
      const randomOpp = backups[Math.floor(Math.random() * backups.length)]; // AI wins, AI gets main, I get backup (Wait! Actually if I didn't raise, nobody gets main)
      setResultWinner(null);
      setAuctionResultInfo(null);
      setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
      setMyTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
    }
    setPhase("result");
    if (lastRaiser === uid) triggerResultAnimation();
    setTimeout(() => {
      setPhase("bid");
      setResultWinner(null);
      goNext(playerIdx + 1, true);
    }, 2800);
  }`
);

// 8. Replace handleMyPass logic for Bot
code = code.replace(
  `    if (isBot) {
      if (lastRaiser === BOT_UID) {
        botBudgetRef.current -= currentBid;
        setOpponentBudget(botBudgetRef.current);
        setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = currentPlayer?.name; return n; });
        setMyTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
        setResultWinner("opp");
      } else {
        setResultWinner(null);
        setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
        setMyTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
      }
      setPhase("result");
      setTimeout(() => {
        setPhase("bid");
        setResultWinner(null);
        goNext(playerIdx + 1, true);
      }, 1500);
      return;
    }`,
  `    if (isBot) {
      const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"];
      if (lastRaiser === BOT_UID) {
        const randomMe = backups[Math.floor(Math.random() * backups.length)];
        botBudgetRef.current -= currentBid;
        setOpponentBudget(botBudgetRef.current);
        setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = currentPlayer?.name; return n; });
        setMyTeam(prev => { const n = [...prev]; n[playerIdx] = randomMe.name; return n; });
        setResultWinner("opp");
        setAuctionResultInfo({ mainPlayer: currentPlayer, backupPlayer: randomMe, winner: BOT_UID });
      } else {
        setResultWinner(null);
        setAuctionResultInfo(null);
        setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
        setMyTeam(prev => { const n = [...prev]; n[playerIdx] = "—"; return n; });
      }
      setPhase("result");
      if (lastRaiser === BOT_UID) triggerResultAnimation();
      setTimeout(() => {
        setPhase("bid");
        setResultWinner(null);
        goNext(playerIdx + 1, true);
      }, 2800);
      return;
    }`
);

// 9. Replace handleMyPass logic for Firebase
code = code.replace(
  `    const oppUid = Object.keys(roomData?.players || {}).find(k => k !== uid)!;
    if (lastRaiser === oppUid) {
      const newBudgets = { ...roomData.game.budgets };
      newBudgets[oppUid] = (newBudgets[oppUid] ?? BUDGET_TOTAL) - currentBid;
      const newTeams = { ...roomData.game.teams };
      newTeams[oppUid] = [...(newTeams[oppUid] ?? []), currentPlayer?.name];
      newTeams[uid] = [...(newTeams[uid] ?? []), "—"];

      update(roomRef.current!, {
        "game/budgets": newBudgets, "game/teams": newTeams, "game/phase": "result"
      });
    } else {
      const newTeams = { ...roomData.game.teams };
      newTeams[oppUid] = [...(newTeams[oppUid] ?? []), "—"];
      newTeams[uid] = [...(newTeams[uid] ?? []), "—"];
      update(roomRef.current!, { "game/teams": newTeams, "game/phase": "result" });
    }`,
  `    const oppUid = Object.keys(roomData?.players || {}).find(k => k !== uid)!;
    const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"];
    if (lastRaiser === oppUid) {
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      const newBudgets = { ...roomData.game.budgets };
      newBudgets[oppUid] = (newBudgets[oppUid] ?? BUDGET_TOTAL) - currentBid;
      const newTeams = { ...roomData.game.teams };
      newTeams[oppUid] = [...(newTeams[oppUid] ?? []), currentPlayer?.name];
      newTeams[uid] = [...(newTeams[uid] ?? []), randomMe.name];

      update(roomRef.current!, {
        "game/budgets": newBudgets, "game/teams": newTeams, "game/phase": "result",
        "game/lastResult": { winner: oppUid, mainPlayer: currentPlayer, backupPlayer: randomMe }
      });
    } else {
      const newTeams = { ...roomData.game.teams };
      newTeams[oppUid] = [...(newTeams[oppUid] ?? []), "—"];
      newTeams[uid] = [...(newTeams[uid] ?? []), "—"];
      update(roomRef.current!, { "game/teams": newTeams, "game/phase": "result", "game/lastResult": null });
    }`
);

// 10. Update Firebase player1 timeout to advance to next card after result phase
code = code.replace(
  `  useEffect(() => {
    if (isBot || myRole !== "player1" || !roomData?.game) return;
    if (roomData.game.phase === "result") {
      const timer = setTimeout(() => {
        const nextIdx = roomData.game.playerIdx + 1;
        if (nextIdx >= players.length) {
          update(roomRef.current!, { "game/phase": "end" });
        } else {
          update(roomRef.current!, {
            "game/phase": "bid", "game/playerIdx": nextIdx,
            "game/currentBid": players[nextIdx]?.basePrice ?? 5,
            "game/lastRaiser": null, "game/turn": uid
          });
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [roomData?.game?.phase]);`,
  `  useEffect(() => {
    if (isBot || myRole !== "player1" || !roomData?.game) return;
    if (roomData.game.phase === "result") {
      const timer = setTimeout(() => {
        const nextIdx = roomData.game.playerIdx + 1;
        if (nextIdx >= players.length) {
          update(roomRef.current!, { "game/phase": "end" });
        } else {
          update(roomRef.current!, {
            "game/phase": "bid", "game/playerIdx": nextIdx,
            "game/currentBid": players[nextIdx]?.basePrice ?? 5,
            "game/lastRaiser": null, "game/turn": uid
          });
        }
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [roomData?.game?.phase]);`
);


// 11. Replace UI for result phase
code = code.replace(
  `  if (phase === "end") {`,
  `  if (phase === "result") {
    return (
      <View style={styles.endBg}>
        <SafeAreaView style={styles.endContainer}>
          {resultWinner && auctionResultInfo ? (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", width: "100%" }}>
              <Text style={styles.endTitle}>{resultWinner === "me" ? "فزت بالصفقة! 🎉" : \`\${opponentName} فاز بالصفقة!\`}</Text>
              
              <View style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center", marginTop: 40 }}>
                {/* Main Player Card */}
                <Animated.View style={[styles.cardContainer, { position: "absolute", transform: [{ translateY: resCard1Anim }] }]}>
                  <Text style={{ color: "#22c55e", fontWeight: "bold", textAlign: "center", marginBottom: 5 }}>{resultWinner === "me" ? "لاعبك الجديد" : "لاعب الخصم"}</Text>
                  {auctionResultInfo.mainPlayer.imageUrl ? (
                    <Image source={{ uri: auctionResultInfo.mainPlayer.imageUrl }} style={{ width: width * 0.48, aspectRatio: 0.72, borderRadius: 12, borderWidth: 3, borderColor: "#22c55e" }} resizeMode="contain" />
                  ) : (
                    <View style={[styles.playerCard, { borderColor: "#22c55e", borderWidth: 3 }]}>
                      <Text style={styles.playerRating}>{auctionResultInfo.mainPlayer.rating}</Text>
                      <Text style={styles.playerPos}>{auctionResultInfo.mainPlayer.position}</Text>
                      <Text style={styles.playerEmoji}>⚽</Text>
                      <Text style={styles.playerName}>{auctionResultInfo.mainPlayer.name}</Text>
                    </View>
                  )}
                </Animated.View>

                {/* Backup Player Card */}
                <Animated.View style={[styles.cardContainer, { position: "absolute", transform: [{ translateY: resCard2Anim }] }]}>
                  <Text style={{ color: "#ef4444", fontWeight: "bold", textAlign: "center", marginBottom: 5 }}>{resultWinner === "me" ? "تعويض الخصم" : "لاعبك التعويض"}</Text>
                  {auctionResultInfo.backupPlayer.imageUrl ? (
                    <Image source={{ uri: auctionResultInfo.backupPlayer.imageUrl }} style={{ width: width * 0.48, aspectRatio: 0.72, borderRadius: 12, borderWidth: 3, borderColor: "#ef4444" }} resizeMode="contain" />
                  ) : (
                    <View style={[styles.playerCard, { borderColor: "#ef4444", borderWidth: 3 }]}>
                      <Text style={styles.playerRating}>{auctionResultInfo.backupPlayer.rating}</Text>
                      <Text style={styles.playerPos}>{auctionResultInfo.backupPlayer.position}</Text>
                      <Text style={styles.playerEmoji}>⚽</Text>
                      <Text style={styles.playerName}>{auctionResultInfo.backupPlayer.name}</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.endTitle}>⚡ اللاعب لم يُشترَ ⚡</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  if (phase === "end") {`
);

fs.writeFileSync(path, code, 'utf8');
console.log('Done patching online-auction.tsx');
