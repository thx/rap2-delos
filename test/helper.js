/* global before, after */
const Random = require('mockjs').Random
module.exports = {
  mockUsers: () => [{}, {}, {}, {}, {}].map(item => (
    {
      fullname: Random.cname(),
      email: Random.email(),
      password: Random.word(6)
    }
  )),
  mockRepository: () => (
    {
      name: '测试用例_临时_' + Random.ctitle(6) + Math.random(),
      description: Random.cparagraph(),
      logo: Random.url()
    }
  ),
  prepare: (request, should, users, repository) => {
    users.forEach((item, index) => {
      before(done => {
        request.post('/account/register').send(item).expect(200)
          .end((err, res) => {
            should.not.exist(err)
            Object.assign(item, res.body.data)
            done()
          })
      })
    })
    before(done => {
      request.post('/account/login')
        .send({ email: users[0].email, password: users[0].password })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          should.not.exist(err)
          let { data } = res.body
          data.should.be.a('object').have.all.keys({ id: users[0].id, fullname: users[0].fullname, email: users[0].email })
          done()
        })
    })
    if (repository) {
      before(done => {
        request.post('/repository/create')
        .send(
          Object.assign(repository, {
            organizationId: undefined,
            memberIds: users.slice(2).map(item => item.id)
          })
        )
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          should.not.exist(err)
          Object.assign(repository, res.body.data)
          done()
        })
      })
      after(done => {
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
    }
    after(done => {
      request.get('/account/logout')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          should.not.exist(err)
          done()
        })
    })
    users.forEach((item, index) => {
      after(done => {
        request.get('/account/remove').query({ id: users[index].id }).expect(200)
          .end((err, res) => {
            should.not.exist(err)
            res.body.data.should.eq(1)
            done()
          })
      })
    })
  },
  keys: {
    pagination: ['cursor', 'limit', 'total']
  },
  excludes: {
    user: ['password', 'create_date', 'update_date', 'delete_date', 'reserve'],
    organization: [],
    repository: ['create_date', 'update_date', 'delete_date', 'reserve']
  }
}
