const Observable =  require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

class Room extends Observable {
    constructor (name, floor, doors_to, dirt) {
        super()
        this.name = name;
        this.floor = floor
        this.doors_to = doors_to
        this.set('dirt', dirt)
    }
    
    clean(){
        this.dirt = false
    }

    dirty(){
        this.dirt = true
    }
}

module.exports = Room