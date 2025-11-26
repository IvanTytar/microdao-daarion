'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Shield, Users, Vote, FileText, Loader2, CheckCircle2, XCircle, Clock, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { api, MicroDAO, Proposal } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

export default function DAOPage() {
  const params = useParams()
  const daoId = params.id as string
  
  const [dao, setDAO] = useState<MicroDAO | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [daoData, proposalsData] = await Promise.all([
          api.getMicroDAO(daoId),
          api.getProposals(daoId)
        ])
        setDAO(daoData)
        setProposals(proposalsData)
      } catch (error) {
        console.error('Failed to load DAO:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [daoId])

  const handleVote = async (proposalId: string, choice: 'yes' | 'no' | 'abstain') => {
    setVoting(proposalId)
    try {
      await api.vote(proposalId, choice)
      // Reload proposals to get updated vote counts
      const updated = await api.getProposals(daoId)
      setProposals(updated)
    } catch (error) {
      console.error('Failed to vote:', error)
    } finally {
      setVoting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!dao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">MicroDAO не знайдено</h2>
          <Link href="/governance" className="text-amber-400 hover:text-amber-300">
            Повернутися до списку
          </Link>
        </div>
      </div>
    )
  }

  const activeProposals = proposals.filter(p => p.status === 'open')
  const closedProposals = proposals.filter(p => p.status !== 'open')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 py-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/governance"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад до Governance
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{dao.name}</h1>
              <p className="text-slate-400">{dao.description || dao.slug}</p>
            </div>
            <span className={cn(
              'px-3 py-1 rounded-full text-sm',
              dao.is_active 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-700/50 text-slate-400'
            )}>
              {dao.is_active ? 'Активний' : 'Неактивний'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-panel p-4 text-center">
            <Users className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-slate-400">Учасників</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <Vote className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{activeProposals.length}</div>
            <div className="text-xs text-slate-400">Активних</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <FileText className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{proposals.length}</div>
            <div className="text-xs text-slate-400">Всього</div>
          </div>
        </div>

        {/* Active Proposals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Vote className="w-5 h-5 text-cyan-400" />
            Активні пропозиції
          </h2>

          {activeProposals.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <Vote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Немає активних пропозицій для голосування</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleVote}
                  voting={voting === proposal.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Closed Proposals */}
        {closedProposals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Завершені пропозиції
            </h2>

            <div className="space-y-4">
              {closedProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleVote}
                  voting={false}
                  readonly
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProposalCard({
  proposal,
  onVote,
  voting,
  readonly = false
}: {
  proposal: Proposal
  onVote: (id: string, choice: 'yes' | 'no' | 'abstain') => void
  voting: boolean
  readonly?: boolean
}) {
  const totalVotes = proposal.votes_yes + proposal.votes_no + proposal.votes_abstain
  const yesPercent = totalVotes > 0 ? (proposal.votes_yes / totalVotes) * 100 : 0
  const noPercent = totalVotes > 0 ? (proposal.votes_no / totalVotes) * 100 : 0

  const statusColors = {
    draft: 'bg-slate-500/20 text-slate-400',
    open: 'bg-cyan-500/20 text-cyan-400',
    accepted: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    expired: 'bg-amber-500/20 text-amber-400'
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{proposal.title}</h3>
          <p className="text-sm text-slate-400">{proposal.description || 'Без опису'}</p>
        </div>
        <span className={cn('px-2 py-0.5 text-xs rounded-full', statusColors[proposal.status])}>
          {proposal.status}
        </span>
      </div>

      {/* Vote Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>За: {proposal.votes_yes}</span>
          <span>Проти: {proposal.votes_no}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 transition-all"
            style={{ width: `${yesPercent}%` }}
          />
          <div 
            className="bg-red-500 transition-all"
            style={{ width: `${noPercent}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Всього голосів: {totalVotes}
        </div>
      </div>

      {/* Vote Buttons */}
      {!readonly && proposal.status === 'open' && (
        <div className="flex gap-2 pt-4 border-t border-white/5">
          <button
            onClick={() => onVote(proposal.id, 'yes')}
            disabled={voting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
            За
          </button>
          <button
            onClick={() => onVote(proposal.id, 'no')}
            disabled={voting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
            Проти
          </button>
          <button
            onClick={() => onVote(proposal.id, 'abstain')}
            disabled={voting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-400 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
            Утримався
          </button>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-xs text-slate-500">
        <span>Створено: {formatDate(proposal.created_at)}</span>
        {proposal.closes_at && <span>Закінчується: {formatDate(proposal.closes_at)}</span>}
      </div>
    </div>
  )
}

