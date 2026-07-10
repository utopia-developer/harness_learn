import {
  type FrontendAuditEventDto,
  type FrontendAuditEventRequest,
  type UserRole
} from "../../../packages/contracts/src/index.js";

export type FrontendAuditActor = {
  actorId: string;
  role: UserRole;
};

export type FrontendAuditStore = {
  record(actor: FrontendAuditActor, input: FrontendAuditEventRequest): FrontendAuditEventDto;
  list(): FrontendAuditEventDto[];
};

export function createFrontendAuditStore(): FrontendAuditStore {
  const events: FrontendAuditEventDto[] = [];

  return {
    record(actor, input) {
      const event: FrontendAuditEventDto = {
        id: `frontend-audit-${events.length + 1}`,
        actorId: actor.actorId,
        role: actor.role,
        action: input.action,
        target: input.target,
        route: input.route,
        metadata: input.metadata ?? {},
        recordedAt: new Date().toISOString()
      };
      events.push(event);
      return event;
    },
    list() {
      return [...events];
    }
  };
}
