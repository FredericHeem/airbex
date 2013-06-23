/* global describe, it */
var expect = require('expect.js')
, db = require('../db')

describe('db', function() {
	describe('build', function() {
		describe('insert', function() {
			it('supports multiple arguments', function() {
				var query = db.build.insert('person', {
					name: 'Bob',
					age: 11
				})

				expect(query).to.eql({
					text: 'INSERT INTO person (name, age) VALUES ($1, $2)',
					values: ['Bob', 11]
				})
			})

			it('supports returning', function() {
				var query = db.build.insert('person', {
					name: 'Bob',
					age: 11
				}, 'user_id')

				expect(query).to.eql({
					text: 'INSERT INTO person (name, age) VALUES ($1, $2) ' +
						'RETURNING user_id',
					values: ['Bob', 11]
				})
			})
		})
	})
})
