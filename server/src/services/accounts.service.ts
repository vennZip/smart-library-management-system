import { isUserRole, type UserRole } from '../auth/auth.types.js'

export type AccountStatus = 'active' | 'suspended'
export interface ManagedAccount { id:string;email:string;displayName:string;role:UserRole;status:AccountStatus;createdAt:string;lastSignInAt:string|null }
export interface CreateAccountInput { email:string;password:string;displayName:string;role:UserRole }
export interface AccountsRepository {
  list():Promise<ManagedAccount[]>
  create(input:CreateAccountInput):Promise<ManagedAccount>
  updateRole(id:string,role:UserRole):Promise<ManagedAccount|null>
  updateStatus(id:string,status:AccountStatus):Promise<ManagedAccount|null>
  resetPassword(id:string,password:string):Promise<boolean>
}
export class AccountValidationError extends Error {}

function text(value:unknown,label:string,max:number):string{if(typeof value!=='string'||!value.trim())throw new AccountValidationError(`${label} is required`);const cleaned=value.trim();if(cleaned.length>max)throw new AccountValidationError(`${label} is too long`);return cleaned}
function password(value:unknown):string{const result=text(value,'Password',128);if(result.length<8)throw new AccountValidationError('Password must contain at least 8 characters');return result}

export class AccountsService {
  readonly #repository:AccountsRepository
  constructor(repository:AccountsRepository){this.#repository=repository}
  list(){return this.#repository.list()}
  create(raw:Record<string,unknown>){const email=text(raw.email,'Email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AccountValidationError('A valid email address is required');const displayName=text(raw.displayName,'Display name',120);const role=raw.role;if(!isUserRole(role))throw new AccountValidationError('Role must be student, librarian, or admin');return this.#repository.create({email,password:password(raw.password),displayName,role})}
  update(id:string,actorId:string,raw:Record<string,unknown>){if(id===actorId)throw new AccountValidationError('You cannot change your own role or account status');if(raw.role!==undefined){if(!isUserRole(raw.role))throw new AccountValidationError('Invalid account role');return this.#repository.updateRole(id,raw.role)}if(raw.status!==undefined){if(raw.status!=='active'&&raw.status!=='suspended')throw new AccountValidationError('Invalid account status');return this.#repository.updateStatus(id,raw.status)}throw new AccountValidationError('Provide a role or status to update')}
  resetPassword(id:string,raw:Record<string,unknown>){return this.#repository.resetPassword(id,password(raw.password))}
}
