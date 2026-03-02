import { ACTION_SPEC_BY_NAME } from '../gateways/actionsSpec';

type FieldSpec = { field: string; type: string; required: boolean; constraints: string };
type ActionSpec = {
  gateway: 'public'|'client'|'admin';
  auth: { required: boolean; notes: string };
  rbac?: { module: string; rolesAllowed: string[]; storeAccessRequired: boolean };
  storeScope: { storeIdRequired: boolean; storeIdSource: 'request.storeId' | 'userContext.myStore' | 'derived' };
  input: {
    payloadSchema: FieldSpec[];
    pagination?: { mode: 'offset'; fields: ['page','pageSize'] };
    filters?: string[];
    sort?: string[];
  };
  output: {
    dataShape: string;
    example: Record<string, unknown>;
  };
  steps: string[];
  errors: Array<{ code: 'badRequest'|'unauthenticated'|'forbidden'|'notFound'|'conflict'|'failedPrecondition'|'internal'; when: string; details: string }>;
};

const inferPayload = (name: string): FieldSpec[] => {
  if (name.endsWith('List') || name.includes('History') || name.includes('Overview') || name.includes('Runs')) {
    return [
      { field: 'page', type: 'number', required: false, constraints: 'min:1 default:1' },
      { field: 'pageSize', type: 'number', required: false, constraints: 'min:1 max:100 default:20' },
      { field: 'q', type: 'string', required: false, constraints: 'trim max:120' },
      { field: 'status', type: 'string', required: false, constraints: 'enum by module' },
    ];
  }
  if (name.includes('Get') || name.includes('ById') || name.includes('BySlug')) {
    return [{ field: 'idOrSlug', type: 'string', required: false, constraints: 'uuid|slug according to action' }];
  }
  if (name.includes('Create') || name.includes('Update') || name.includes('Add') || name.includes('Set') || name.includes('Apply') || name.includes('Confirm') || name.includes('Approve') || name.includes('Reject')) {
    return [{ field: 'payload', type: 'object', required: true, constraints: 'module-specific validated object' }];
  }
  return [{ field: 'payload', type: 'object', required: false, constraints: 'module-specific' }];
};

const inferModule = (name: string): string => {
  const p = [
    ['Catalog','CATALOG'],['Product','PRODUCTS'],['Category','CATALOG'],['Orders','ORDERS'],['Order','ORDERS'],['Shipping','SHIPPING'],['Delivery','SHIPPING'],['Discount','MARKETING'],['Cashback','MARKETING'],['Loyalty','MARKETING'],['Reports','REPORTS'],['Accounting','ACCOUNTING'],['Drawer','ACCOUNTING'],['Branch','ACCOUNTING'],['Device','ACCOUNTING'],['Employee','ACCOUNTING'],['Insurance','INSURANCE'],['Risk','RISK'],['Seo','SEO'],['Landing','SEO'],['Notification','SUPPORT'],['Support','SUPPORT'],['Media','MEDIA']
  ] as const;
  const found = p.find(([k]) => name.includes(k));
  return found ? found[1] : 'STORES';
};

export const ACTION_SPECS: Record<string, ActionSpec> = Object.fromEntries(
  Array.from(ACTION_SPEC_BY_NAME.values()).map((s) => {
    const isList = s.name.endsWith('List') || s.name.includes('History') || s.name.includes('Overview') || s.name.includes('Runs');
    const module = inferModule(s.name);
    const spec: ActionSpec = {
      gateway: s.gateway,
      auth: {
        required: s.requiresAuth,
        notes: s.gateway === 'client' ? 'Firebase uid is mandatory and all resources are owner-scoped.' : s.gateway === 'admin' ? 'Firebase uid mandatory with RBAC.' : 'Auth optional, read-only action.',
      },
      rbac: s.gateway === 'admin' ? { module, rolesAllowed: ['SUPER_ADMIN', module], storeAccessRequired: s.requiresStore } : undefined,
      storeScope: { storeIdRequired: s.requiresStore, storeIdSource: s.requiresStore ? 'request.storeId' : 'derived' },
      input: {
        payloadSchema: inferPayload(s.name),
        pagination: isList ? { mode: 'offset', fields: ['page','pageSize'] } : undefined,
        filters: isList ? ['status','q'] : undefined,
        sort: isList ? ['createdAt','updatedAt'] : undefined,
      },
      output: {
        dataShape: isList ? '{ items:any[], total:number }' : '{ result:any }',
        example: isList ? { items: [], total: 0 } : { result: { action: s.name } },
      },
      steps: [
        'validate request envelope and action',
        'validate auth according to gateway',
        'validate RBAC or owner scope',
        'validate payload schema strictly',
        'perform DB reads using indexed fields',
        'open transaction for write actions and apply invariants',
        'commit or rollback on error',
        'write audit/events/notifications if required',
        'return unified response envelope',
      ],
      errors: [
        { code: 'badRequest', when: 'payload schema invalid', details: '{ fieldErrors: Record<string,string> }' },
        { code: 'unauthenticated', when: 'missing auth token for protected action', details: '{}' },
        { code: 'forbidden', when: 'RBAC/store access or owner scope fails', details: '{}' },
        { code: 'notFound', when: 'target resource does not exist', details: '{}' },
        { code: 'conflict', when: 'unique constraint/state transition conflict', details: '{}' },
        { code: 'failedPrecondition', when: 'business invariant blocked operation', details: '{}' },
        { code: 'internal', when: 'unexpected exception', details: '{}' },
      ],
    };
    return [s.name, spec];
  }),
);
