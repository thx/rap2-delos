/* global describe, it, before */
const app = require('../dist/scripts/app').default
const request = require('supertest').agent(app.listen())
const should = require('chai').should()
const Random = require('mockjs').Random
const { Repository } = require('../dist/models')
const { mockUsers, prepare, keys } = require('./helper')

describe('Repository', () => {
  let users = mockUsers()
  prepare(request, should, users)

  let repository = {}
  before(done => {
    repository = {
      name: `测试用例_临时仓库_${Random.ctitle(6)}_${Date.now()}`,
      description: Random.cparagraph(),
      logo: Random.url(),
      organizationId: undefined,
      memberIds: users.slice(2).map(item => item.id)
    }
    done()
  })
  let validRepository = (repository, deep) => {
    repository.should.be.a('object').have.all.keys(
      [...Object.keys(Repository.attributes), 'creator', 'owner', 'members', 'locker', 'organization', 'collaborators']
        .concat(deep ? ['modules'] : [])
    )
    let { creator, owner, members } = repository
    creator.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
    owner.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
    members.should.be.a('array').have.length.within(3, 3)
    members.forEach((user, index) => {
      owner.should.be.a('object').have.all.keys(['id', 'fullname', 'email'])
    })
  }
  let validPagination = (pagination) => {
    pagination.should.be.a('object').contain.all.keys(keys.pagination)
  }

  it('/repository/create', done => {
    request.post('/repository/create')
      .send(repository)
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validRepository(res.body.data, true)
        repository = res.body.data
        done()
      })
  })
  it('/repository/count', done => {
    request.get('/repository/count')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.to.be.a('number').above(0)
        done()
      })
  })
  it('/repository/list', done => {
    request.get('/repository/list')
      .query({ name: repository.name, cursor: 1, limit: 1 })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        let { data, pagination } = res.body
        data.should.be.a('array').have.length.within(1, 1)
        data.forEach(item => {
          validRepository(item)
        })
        validPagination(pagination)
        done()
      })
  })
  it('/repository/get', done => {
    request.get('/repository/get')
      .query({ id: repository.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        validRepository(res.body.data, true)
        done()
      })
  })
  it('/repository/update', done => {
    request.post('/repository/update')
      .send(Object.assign({}, repository, { name: `测试用例_临时仓库_${Random.ctitle(6)}_${Date.now()}` }))
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/repository/lock', done => {
    request.post('/repository/lock')
      .send({ id: repository.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/repository/unlock', done => {
    request.post('/repository/unlock')
      .send({ id: repository.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/repository/transfer', done => {
    request.post('/repository/transfer')
      .send({ id: repository.id, ownerId: users[1].id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
  it('/repository/remove', done => {
    request.get('/repository/remove')
      .query({ id: repository.id })
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.body.data.should.eq(1)
        done()
      })
  })
})
