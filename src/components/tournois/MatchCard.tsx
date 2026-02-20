"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Check, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { Match, useTournament } from "@/lib/context/TournamentContext";
import { useAuth } from "@/lib/context/AuthContext";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

interface MatchCardProps {
    match: Match;
    currentUserTeamId?: string;
}

export function MatchCard({ match, currentUserTeamId }: MatchCardProps) {
    const { getTeam, proposeMatchScore, updateMatchScore, validateMatch } = useTournament();
    const { isAdmin, isOrganisateur } = useAuth();
    const team1 = match.team1Id ? getTeam(match.team1Id) : null;
    const team2 = match.team2Id ? getTeam(match.team2Id) : null;

    const isTeam1 = currentUserTeamId === match.team1Id;
    const isTeam2 = currentUserTeamId === match.team2Id;
    const isParticipant = isTeam1 || isTeam2;
    const canManageScores = isAdmin || isOrganisateur;

    // État local pour les scores avec flèches
    const [ourScore, setOurScore] = useState(0);
    const [theirScore, setTheirScore] = useState(0);
    const [needsValidation, setNeedsValidation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Réinitialiser si le match change
    useEffect(() => {
        setOurScore(0);
        setTheirScore(0);
        setNeedsValidation(false);
    }, [match.id]);

    // Vérifier si un score atteint 13
    useEffect(() => {
        if (ourScore === 13 || theirScore === 13) {
            setNeedsValidation(true);
        }
    }, [ourScore, theirScore]);

    const incrementScore = (type: 'our' | 'their') => {
        if (type === 'our' && ourScore < 13) {
            setOurScore(prev => prev + 1);
        } else if (type === 'their' && theirScore < 13) {
            setTheirScore(prev => prev + 1);
        }
    };

    const decrementScore = (type: 'our' | 'their') => {
        if (type === 'our' && ourScore > 0) {
            setOurScore(prev => prev - 1);
            if (ourScore === 13) setNeedsValidation(false);
        } else if (type === 'their' && theirScore > 0) {
            setTheirScore(prev => prev - 1);
            if (theirScore === 13) setNeedsValidation(false);
        }
    };

    const handleValidate = async () => {
        if (ourScore === theirScore) return; // Pas d'égalité en pétanque
        if (!currentUserTeamId) return;
        if (ourScore !== 13 && theirScore !== 13) return; // Au moins un doit être à 13

        setIsSubmitting(true);

        // Pour team1: score1 = notre score, score2 = leur score
        // Pour team2: score1 = leur score (team1), score2 = notre score
        if (isTeam1) {
            await proposeMatchScore(match.id, currentUserTeamId, ourScore, theirScore);
        } else if (isTeam2) {
            await proposeMatchScore(match.id, currentUserTeamId, theirScore, ourScore);
        }

        setIsSubmitting(false);
    };

    const canValidate = match.status === 'ongoing' &&
        needsValidation &&
        ourScore !== theirScore &&
        (ourScore === 13 || theirScore === 13) &&
        (isParticipant || canManageScores) &&
        !(isTeam1 && match.team1Validated) &&
        !(isTeam2 && match.team2Validated);

    // Pour les organisateurs/admin: validation directe du match (sans attendre les équipes)
    const handleAdminValidate = async () => {
        if (score1 === score2) return;

        setIsSubmitting(true);
        await updateMatchScore(match.id, score1, score2);
        await validateMatch(match.id);
        setIsSubmitting(false);
    };

    // Scores pour l'interface admin (team1 vs team2)
    const [score1, setScore1] = useState(match.score1 ?? 0);
    const [score2, setScore2] = useState(match.score2 ?? 0);

    // Sync avec le match si déjà des scores
    useEffect(() => {
        setScore1(match.score1 ?? 0);
        setScore2(match.score2 ?? 0);
    }, [match.score1, match.score2]);

    const isCompleted = match.status === 'completed';
    const isBye = !match.team2Id && isCompleted && match.winnerId === match.team1Id;

    // Rendu simplifié pour les matchs Bye (exempt)
    if (isBye) {
        return (
            <Card className="w-72 border-2 border-gray-200 bg-gray-50/50">
                <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center">
                        <span>Match #{match.matchNumber + 1}</span>
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">Exempt</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-green-100 dark:bg-green-900/30">
                        <div className="truncate flex-1 text-sm font-bold text-foreground">
                            {team1?.name || "Équipe"}
                        </div>
                        <span className="text-xs text-green-600 font-medium">Qualifié(e)</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Vérifier si les deux équipes ont validé
    const bothValidated = match.team1Validated && match.team2Validated;

    // Vérifier si les scores correspondent
    const scoresMatch = bothValidated &&
        match.team1ProposedScore1 === match.team2ProposedScore1 &&
        match.team1ProposedScore2 === match.team2ProposedScore2;

    const hasDispute = bothValidated && !scoresMatch;

    return (
        <Card className={`w-72 border-2 ${isParticipant ? "border-orange-500 bg-orange-100 dark:bg-orange-950/40 shadow-lg shadow-orange-300 dark:shadow-orange-900 ring-2 ring-orange-300 dark:ring-orange-700" : ""} ${!isParticipant && isCompleted ? "border-green-500/20 bg-green-50/50" : !isParticipant && scoresMatch ? "border-green-500 bg-green-50/50" : !isParticipant && hasDispute ? "border-red-500 bg-red-50/50" : !isParticipant ? "border-border" : ""}`}>
            <CardContent className="p-3">
                {/* En-tête */}
                <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center">
                    <span>Match #{match.matchNumber + 1}</span>
                    <div className="flex items-center gap-2">
                        {match.terrainNumber && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                                Terrain {match.terrainNumber}
                            </span>
                        )}
                        {match.isPlayIn && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Barrage</span>}
                        {isCompleted && <span className="text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Terminé</span>}
                    </div>
                </div>

                {/* Bouton Chat */}
                {isParticipant && (
                    <Link
                        href={`/messages?matchId=${match.id}`}
                        className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg transition-all mb-3 text-sm font-medium"
                    >
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span>Chat avec l&apos;adversaire</span>
                    </Link>
                )}

                {/* Affichage des équipes avec scores en temps réel */}
                <div className="space-y-2 mb-3">
                    <div className={`flex justify-between items-center p-2 rounded border-2 ${isTeam1 ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20" : "border-transparent"} ${match.winnerId === match.team1Id ? "bg-green-100 dark:bg-green-900/30 font-bold" : score1 === 13 && !isCompleted ? "bg-blue-50" : ""}`}>
                        <div className={`truncate flex-1 text-sm font-medium ${isTeam1 ? "text-orange-700 dark:text-orange-300" : ""}`} title={team1?.name}>
                            {match.team1Id ? (team1?.name || "Équipe 1") : "..."}
                            {match.team1Validated && <Check className="inline h-3 w-3 ml-1 text-green-600" />}
                        </div>
                        <span className={`font-bold ml-2 text-lg ${score1 === 13 && !isCompleted ? "text-blue-600" : ""}`}>
                            {isCompleted ? (scoresMatch ? match.team1ProposedScore1 : match.score1) : (canManageScores && !isParticipant ? score1 : (isParticipant && isTeam1 ? ourScore : (isParticipant && isTeam2 ? theirScore : (match.score1 ?? "-"))))}
                        </span>
                    </div>

                    <div className={`flex justify-between items-center p-2 rounded border-2 ${isTeam2 ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20" : "border-transparent"} ${match.winnerId === match.team2Id ? "bg-green-100 dark:bg-green-900/30 font-bold" : score2 === 13 && !isCompleted ? "bg-orange-50" : ""}`}>
                        <div className={`truncate flex-1 text-sm font-medium ${isTeam2 ? "text-orange-700 dark:text-orange-300" : ""}`} title={team2?.name}>
                            {match.team2Id ? (team2?.name || "Équipe 2") : (match.status === 'completed' && match.winnerId === match.team1Id ? "-- Bye --" : "...")}
                            {match.team2Validated && <Check className="inline h-3 w-3 ml-1 text-green-600" />}
                        </div>
                        <span className={`font-bold ml-2 text-lg ${score2 === 13 && !isCompleted ? "text-orange-600" : ""}`}>
                            {isCompleted ? (scoresMatch ? match.team1ProposedScore2 : match.score2) : (canManageScores && !isParticipant ? score2 : (isParticipant && isTeam1 ? theirScore : (isParticipant && isTeam2 ? ourScore : (match.score2 ?? "-"))))}
                        </span>
                    </div>
                </div>

                {/* Status de validation */}
                {scoresMatch && (
                    <div className="bg-green-100 border border-green-500 text-green-700 px-3 py-2 rounded-lg text-center font-medium text-sm mb-3 flex items-center justify-center gap-2">
                        <Check className="h-4 w-4" />
                        Validé
                    </div>
                )}

                {hasDispute && (
                    <div className="bg-red-100 border border-red-500 text-red-700 px-3 py-2 rounded-lg text-center font-medium text-xs mb-3 flex items-center justify-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Litige, aller voir la table de marque
                    </div>
                )}

                {/* Interface de score avec flèches pour l'équipe participante */}
                {match.status === 'ongoing' && isParticipant && !isCompleted && (
                    <div className="border-t pt-3 mt-3">
                        {(isTeam1 && match.team1Validated) || (isTeam2 && match.team2Validated) ? (
                            <div className="text-xs text-green-600 font-medium text-center py-2">
                                Score validé - En attente de l&apos;autre équipe
                            </div>
                        ) : (
                            <>
                                <div className="text-xs font-medium mb-3 text-center">Comptez vos points :</div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    {/* Notre score */}
                                    <div className="flex flex-col items-center">
                                        <label className="text-[10px] text-muted-foreground mb-1">Nous</label>
                                        <div className="flex flex-col items-center bg-primary/5 rounded-lg p-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-12 p-0"
                                                onClick={() => incrementScore('our')}
                                                disabled={ourScore >= 13}
                                            >
                                                <ChevronUp className="h-5 w-5" />
                                            </Button>
                                            <span className={`text-3xl font-bold py-1 ${ourScore === 13 ? 'text-green-600' : ''}`}>
                                                {ourScore}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-12 p-0"
                                                onClick={() => decrementScore('our')}
                                                disabled={ourScore <= 0}
                                            >
                                                <ChevronDown className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Score adversaire */}
                                    <div className="flex flex-col items-center">
                                        <label className="text-[10px] text-muted-foreground mb-1">Eux</label>
                                        <div className="flex flex-col items-center bg-orange-500/5 rounded-lg p-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-12 p-0"
                                                onClick={() => incrementScore('their')}
                                                disabled={theirScore >= 13}
                                            >
                                                <ChevronUp className="h-5 w-5" />
                                            </Button>
                                            <span className={`text-3xl font-bold py-1 ${theirScore === 13 ? 'text-orange-600' : ''}`}>
                                                {theirScore}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-12 p-0"
                                                onClick={() => decrementScore('their')}
                                                disabled={theirScore <= 0}
                                            >
                                                <ChevronDown className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bouton de validation - apparaît quand un score atteint 13 */}
                                {needsValidation && (
                                    <Button
                                        size="sm"
                                        className="w-full h-10 text-sm bg-green-600 hover:bg-green-700 font-semibold"
                                        onClick={handleValidate}
                                        disabled={!canValidate || isSubmitting}
                                    >
                                        {isSubmitting ? "Validation..." : `Valider ${ourScore} - ${theirScore}`}
                                    </Button>
                                )}

                                {!needsValidation && (ourScore > 0 || theirScore > 0) && (
                                    <p className="text-[10px] text-center text-muted-foreground">
                                        Le premier à 13 points gagne
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Interface Admin/Organisateur pour gérer les scores */}
                {match.status === 'ongoing' && canManageScores && !isCompleted && (
                    <div className="border-t pt-3 mt-3">
                        <div className="text-xs font-medium mb-3 text-center text-orange-600">Mode Organisateur</div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            {/* Score Team 1 */}
                            <div className="flex flex-col items-center">
                                <label className="text-[10px] text-muted-foreground mb-1 truncate max-w-full">{team1?.name || "Équipe 1"}</label>
                                <div className="flex flex-col items-center bg-blue-500/10 rounded-lg p-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-12 p-0"
                                        onClick={() => setScore1(prev => Math.min(13, prev + 1))}
                                        disabled={score1 >= 13}
                                    >
                                        <ChevronUp className="h-5 w-5" />
                                    </Button>
                                    <span className={`text-3xl font-bold py-1 ${score1 === 13 ? 'text-blue-600' : ''}`}>
                                        {score1}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-12 p-0"
                                        onClick={() => setScore1(prev => Math.max(0, prev - 1))}
                                        disabled={score1 <= 0}
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                            {/* Score Team 2 */}
                            <div className="flex flex-col items-center">
                                <label className="text-[10px] text-muted-foreground mb-1 truncate max-w-full">{team2?.name || "Équipe 2"}</label>
                                <div className="flex flex-col items-center bg-orange-500/10 rounded-lg p-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-12 p-0"
                                        onClick={() => setScore2(prev => Math.min(13, prev + 1))}
                                        disabled={score2 >= 13}
                                    >
                                        <ChevronUp className="h-5 w-5" />
                                    </Button>
                                    <span className={`text-3xl font-bold py-1 ${score2 === 13 ? 'text-orange-600' : ''}`}>
                                        {score2}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-12 p-0"
                                        onClick={() => setScore2(prev => Math.max(0, prev - 1))}
                                        disabled={score2 <= 0}
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Bouton de validation admin/organisateur */}
                        {(score1 > 0 || score2 > 0) && score1 !== score2 && (
                            <Button
                                size="sm"
                                className="w-full h-10 text-sm bg-orange-600 hover:bg-orange-700 font-semibold"
                                onClick={handleAdminValidate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Validation..." : `Forcer la validation ${score1} - ${score2}`}
                            </Button>
                        )}

                        {(score1 === 0 && score2 === 0) && (
                            <p className="text-[10px] text-center text-muted-foreground">
                                Entrez les scores pour valider le match
                            </p>
                        )}
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
