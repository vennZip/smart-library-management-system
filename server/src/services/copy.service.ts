import { copyStatuses,type BookCopyInput,type BookCopyRecord,type CopyStatus } from '../copies/copy.types.js'
import type { CopyRepository } from '../repositories/copy.repository.js'

export class CopyValidationError extends Error{}
export class CopyConflictError extends Error{}
function requiredText(value:unknown,field:string,max:number){if(typeof value!=='string'||!value.trim())throw new CopyValidationError(`${field} is required`);const text=value.trim();if(text.length>max)throw new CopyValidationError(`${field} is too long`);return text}
function optionalDate(value:unknown):string|null|undefined{if(value===undefined)return undefined;if(value===null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(`${value}T00:00:00Z`)))throw new CopyValidationError('Acquired date must be a valid date');return value}

export class CopyService{
  readonly #repository:CopyRepository
  constructor(repository:CopyRepository){this.#repository=repository}
  list(bookId:string,rawSearch:unknown){const search=typeof rawSearch==='string'?rawSearch.trim().slice(0,80):'';return this.#repository.listForBook(bookId,search)}
  get(id:string){return this.#repository.findById(id)}
  create(bookId:string,raw:Record<string,unknown>):Promise<BookCopyRecord>{return this.#repository.create(bookId,this.validate(raw,false) as BookCopyInput)}
  update(id:string,raw:Record<string,unknown>):Promise<BookCopyRecord|null>{const input=this.validate(raw,true);if(Object.keys(input).length===0)throw new CopyValidationError('At least one field must be provided');return this.#repository.update(id,input)}
  async delete(id:string):Promise<boolean>{const copy=await this.#repository.findById(id);if(!copy)return false;if(copy.status==='on_loan'||copy.status==='reserved')throw new CopyConflictError('Active or reserved copies cannot be deleted');if(await this.#repository.hasLoanHistory(id))throw new CopyConflictError('Copies with loan history cannot be deleted; mark the copy as lost or maintenance instead');return this.#repository.delete(id)}
  private validate(raw:Record<string,unknown>,partial:boolean):Partial<BookCopyInput>{const result:Partial<BookCopyInput>={};if(!partial||raw.barcode!==undefined)result.barcode=requiredText(raw.barcode,'Barcode',64);if(!partial||raw.shelfLocation!==undefined)result.shelfLocation=requiredText(raw.shelfLocation,'Shelf location',80);if(raw.status!==undefined){if(typeof raw.status!=='string'||!copyStatuses.includes(raw.status as CopyStatus))throw new CopyValidationError('Copy status is invalid');result.status=raw.status as CopyStatus}else if(!partial)result.status='available';if(raw.acquiredAt!==undefined)result.acquiredAt=optionalDate(raw.acquiredAt);return result}
}
