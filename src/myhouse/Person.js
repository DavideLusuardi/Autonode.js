const Observable =  require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

class Person extends Observable {
    constructor (house, name, in_room) {
        super()
        this.house = house;             // reference to the house
        this.name = name;               // non-observable
        this.set('in_room', in_room)  // observable
    }
    moveTo (to) {
        if ( this.house.rooms[this.in_room].doors_to.includes(to) ) {
            this.in_room = to
            // console.log(this.name, '\t moved from', this.in_room, 'to', to)
            return true
        }
        else {
            // console.log(this.name, '\t failed moving from', this.in_room, 'to', to)
            return false
        }
    }
}


class PersonDetectionGoal extends Goal {
    constructor (people) {
        super()

        this.people = people

    }
}

class PersonDetectionIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)
        
        this.people = this.goal.people
    }
    
    static applicable (goal) {
        return goal instanceof PersonDetectionGoal
    }

    *exec () {
        var people_promises = []
        for (let [name, person] of Object.entries(this.people)){
            this.agent.beliefs.declare(`person_in_room ${person.name} ${person.in_room}`) // set initial knowledge

            let person_promise = new Promise( async res => {
                while (true) {
                    let room = await person.notifyChange('in_room')
                    this.log(person.name + ' moved into room ' + room)
                    for(let literal of this.agent.beliefs.matchingLiterals(`person_in_room ${person.name} *`)){
                        this.agent.beliefs.undeclare(literal)
                    }
                    this.agent.beliefs.declare(`person_in_room ${person.name} ${room}`)
                }
            });

            people_promises.push(person_promise)
        }
        yield Promise.all(people_promises)
    }
}

module.exports = {Person, PersonDetectionGoal, PersonDetectionIntention}