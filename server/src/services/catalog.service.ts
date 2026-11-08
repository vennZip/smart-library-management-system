import type { BookInput, BookRecord, CatalogPage } from '../catalog/catalog.types.js'
import type { CatalogRepository } from '../repositories/catalog.repository.js'

export class CatalogValidationError extends Error {}

function cleanText(value:unknown,field:string,max:number):string{
  if(typeof value!=='string'||!value.trim())throw new CatalogValidationError(`${field} is required`)
  const cleaned=value.trim();if(cleaned.length>max)throw new CatalogValidationError(`${field} is too long`);return cleaned
}
function optionalText(value:unknown,max:number):string|null|undefined{if(value===undefined)return undefined;if(value===null||value==='')return null;if(typeof value!=='string')throw new CatalogValidationError('Optional text fields must be strings');const cleaned=value.trim();if(cleaned.length>max)throw new CatalogValidationError('A text field is too long');return cleaned||null}

export class CatalogService {
  readonly #repository:CatalogRepository
  constructor(repository:CatalogRepository){this.#repository=repository}
  list(raw:{search?:unknown;page?:unknown;pageSize?:unknown;includeArchived?:unknown}):Promise<CatalogPage>{const page=Math.max(1,Number(raw.page)||1);const pageSize=Math.min(50,Math.max(1,Number(raw.pageSize)||10));const search=typeof raw.search==='string'?raw.search.trim().slice(0,100):'';return this.#repository.list({search,page,pageSize,includeArchived:raw.includeArchived===true||raw.includeArchived==='true'})}
  get(id:string):Promise<BookRecord|null>{return this.#repository.findById(id)}
  create(raw:Record<string,unknown>):Promise<BookRecord>{return this.#repository.create(this.validate(raw,false) as BookInput)}
  update(id:string,raw:Record<string,unknown>):Promise<BookRecord|null>{const input=this.validate(raw,true);if(Object.keys(input).length===0)throw new CatalogValidationError('At least one field must be provided');return this.#repository.update(id,input)}
  archive(id:string):Promise<boolean>{return this.#repository.archive(id)}
  private validate(raw:Record<string,unknown>,partial:boolean):Partial<BookInput>{const result:Partial<BookInput>={};if(!partial||raw.isbn!==undefined){const isbn=cleanText(raw.isbn,'ISBN',17);if(!/^[0-9Xx-]{10,17}$/.test(isbn))throw new CatalogValidationError('ISBN must contain 10 to 17 digits, X characters, or hyphens');result.isbn=isbn}if(!partial||raw.title!==undefined)result.title=cleanText(raw.title,'Title',240);if(!partial||raw.author!==undefined)result.author=cleanText(raw.author,'Author',180);if(!partial||raw.category!==undefined)result.category=cleanText(raw.category,'Category',80);if(raw.publisher!==undefined)result.publisher=optionalText(raw.publisher,180);if(raw.description!==undefined)result.description=optionalText(raw.description,4000);if(raw.coverUrl!==undefined)result.coverUrl=optionalText(raw.coverUrl,1000);if(raw.publicationYear!==undefined){if(raw.publicationYear===null||raw.publicationYear==='')result.publicationYear=null;else{const year=Number(raw.publicationYear);if(!Number.isInteger(year)||year<1000||year>2200)throw new CatalogValidationError('Publication year must be between 1000 and 2200');result.publicationYear=year}}return result}
}
