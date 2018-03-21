declare interface IHelper {
  include: string[],
  exclude: {
    generalities: string[],
  }
}
export let Helper: IHelper =  {
  include: [],
  exclude: {
    generalities: ['createdAt', 'updatedAt', 'deletedAt', 'reserve'],
  },
}
