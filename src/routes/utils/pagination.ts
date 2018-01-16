/*
    Pagination

    Pure paging implementation reference.
    纯粹的分页参考实现。

    属性
        data        数据
        total       总条数
        cursor      当前页数，第几页，从 1 开始计算
        limit       分页大小
        pages       总页数
        start       当前页的起始下标
        end         当前页的结束下标
        hasPrev     是否有前一页
        hasNext     是否有下一页
        hasFirst    是否有第一页
        hasLast     是否有最后一页
        prev        前一页
        next        后一页
        first       第一页
        last        最后一页
        focus       当前页的当前焦点下标
    方法
        calc()              计算分页状态，当属性值发生变化时，方法 calc() 被调用。
        moveTo(cursor)      移动到指定页
        moveToPrev()        移动到前一页
        moveToNext()        移动到下一页
        moveToFirst()       移动到第一页
        moveToLast()        移动到最后一页
        fetch(arr)          获取当前页的数据，或者用当前状态获取参数 arr 的子集
        setData(data)       更新数据集合
        setTotal(total)     更新总条数
        setCursor(cursor)   更新当前页数
        setFocus(focus)     设置当前焦点
        setLimit(limit)     设置分页大小
        get(focus)          获取一条数据
        toString()          友好打印
        toHTML(url)         生成分页栏

*/

/*
    new Pagination( data, cursor, limit )
    new Pagination( total, cursor, limit )
*/

export default class Pagination {
  public data: any
  public total: any
  public cursor: number
  public limit: number
  public focus: number
  public pages: any
  public start: any
  public end: any
  public hasPrev: any
  public hasNext: any
  public hasFirst: any
  public hasLast: any
  public prev: any
  public next: any
  public first: any
  public last: any

  constructor(data: any, cursor: any, limit: any) {
    this.data = (typeof data === 'number' || typeof data === 'string') ? undefined : data
    this.total = this.data ? this.data.length : parseInt(data, 10)
    this.cursor = parseInt(cursor, 10)
    this.limit = parseInt(limit, 10)
    this.calc()
  }

  public calc() {
    if (this.total && parseInt(this.total, 10) > 0) {
      this.limit = this.limit < 1 ? 1 : this.limit

      this.pages = (this.total % this.limit === 0) ? this.total / this.limit : this.total / this.limit + 1
      this.pages = parseInt(this.pages, 10)
      this.cursor = (this.cursor > this.pages) ? this.pages : this.cursor
      this.cursor = (this.cursor < 1) ? this.pages > 0 ? 1 : 0 : this.cursor

      this.start = (this.cursor - 1) * this.limit
      this.start = (this.start < 0) ? 0 : this.start // 从 0 开始计数
      this.end = (this.start + this.limit > this.total) ? this.total : this.start + this.limit
      this.end = (this.total < this.limit) ? this.total : this.end

      this.hasPrev = (this.cursor > 1)
      this.hasNext = (this.cursor < this.pages)
      this.hasFirst = this.hasPrev
      this.hasLast = this.hasNext

      this.prev = this.hasPrev ? this.cursor - 1 : 0
      this.next = this.hasNext ? this.cursor + 1 : 0
      this.first = this.hasFirst ? 1 : 0
      this.last = this.hasLast ? this.pages : 0

      this.focus = this.focus ? this.focus : 0
      this.focus = this.focus % this.limit + this.start
      this.focus = this.focus > this.end - 1 ? this.end - 1 : this.focus
    } else {
      this.pages = this.cursor = this.start = this.end = 0
      this.hasPrev = this.hasNext = this.hasFirst = this.hasLast = false
      this.prev = this.next = this.first = this.last = 0
      this.focus = 0
    }

    return this
  }

  public moveTo(cursor: any) {
    this.cursor = parseInt(cursor, 10)
    return this.calc()
  }

  public moveToPrev() {
    return this.moveTo(this.cursor - 1)
  }

  public moveToNext() {
    return this.moveTo(this.cursor + 1)
  }

  public moveToFirst() {
    return this.moveTo(1)
  }

  public moveToLast() {
    return this.moveTo(this.pages)
  }

  public fetch(arr: any) {
    return (arr || this.data).slice(this.start, this.end)
  }

  public setData(data: any) {
    this.data = data
    this.total = data.length
    return this.calc()
  }

  public setTotal(total: any) {
    this.total = parseInt(total, 10)
    return this.calc()
  }

  public setCursor(cursor: any) {
    this.cursor = parseInt(cursor, 10)
    return this.calc()
  }

  public setFocus(focus: any) {
    this.focus = parseInt(focus, 10)
    if (this.focus < 0) this.focus += this.total
    if (this.focus >= this.total) this.focus -= this.total
    this.cursor = parseInt(String(this.focus / this.limit), 10) + 1
    return this.calc()
  }

  public setLimit(limit: any) {
    this.limit = parseInt(limit, 10)
    return this.calc()
  }

  public get(focus: any) {
    if (focus !== undefined) return this.data[focus % this.data.length]
    else return this.data[this.focus]
  }

  public toString() {
    return JSON.stringify(this, undefined, 4)
  }

  public to = this.moveTo
  public toPrev = this.moveToPrev
  public toNext = this.moveToNext
  public toFirst = this.moveToFirst
  public toLast = this.moveToLast
}