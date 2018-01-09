/* global describe, it */
let app = require('../dist/scripts/app').default
let request = require('supertest').agent(app.listen())
let should = require('chai').should()

describe('App', () => {
  it('/', (done) => {
    request.get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        done()
      })
  })
  it('/check.node', (done) => {
    request.get('/check.node')
      .expect('Content-Type', /text/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.text.should.eq('success')
        done()
      })
  })
  it('/status.taobao', (done) => {
    request.get('/status.taobao')
      .expect('Content-Type', /text/)
      .expect(200)
      .end((err, res) => {
        should.not.exist(err)
        res.text.should.eq('success')
        done()
      })
  })
})
