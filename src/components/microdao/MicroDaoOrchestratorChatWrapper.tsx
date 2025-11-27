/**
 * Wrapper для вибору між базовим та розширеним чатом
 */

import React from 'react';
import { MicroDaoOrchestratorChat } from './MicroDaoOrchestratorChat';
import { MicroDaoOrchestratorChatEnhanced } from './MicroDaoOrchestratorChatEnhanced';

interface Orchestrator {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
}

interface MicroDaoOrchestratorChatWrapperProps {
  orchestrator?: Orchestrator;
  orchestratorAgentId?: string;
  onClose?: () => void;
  enhanced?: boolean; // Якщо true - використовувати розширену версію
}

/**
 * Wrapper компонент для вибору між базовим та розширеним чатом
 * 
 * @example
 * // Базовий чат
 * <MicroDaoOrchestratorChatWrapper
 *   orchestratorAgentId="helion"
 *   enhanced={false}
 * />
 * 
 * @example
 * // Розширений чат з усіма функціями
 * <MicroDaoOrchestratorChatWrapper
 *   orchestratorAgentId="helion"
 *   enhanced={true}
 * />
 */
export const MicroDaoOrchestratorChatWrapper: React.FC<MicroDaoOrchestratorChatWrapperProps> = ({
  orchestrator,
  orchestratorAgentId,
  onClose,
  enhanced = false,
}) => {
  // Вибираємо версію чату на основі параметра
  if (enhanced) {
    return (
      <MicroDaoOrchestratorChatEnhanced
        orchestrator={orchestrator}
        orchestratorAgentId={orchestratorAgentId}
        onClose={onClose}
      />
    );
  }

  return (
    <MicroDaoOrchestratorChat
      orchestrator={orchestrator}
      orchestratorAgentId={orchestratorAgentId}
      onClose={onClose}
    />
  );
};





