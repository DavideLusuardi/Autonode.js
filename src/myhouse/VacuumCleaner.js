const pddlActionIntention = require('../pddl/actions/pddlActionIntention')
const Observable =  require('../utils/Observable')
const Agent = require('../bdi/Agent')

class VacuumCleanerDevice extends Observable {
    constructor(name, room){
        let init = {name:name, at: room}
        super(init)
    }

    suck(){
    }

    move(){    
    }
}


class Suck extends pddlActionIntention {

    *exec () {
        this.agent.devices.vacuum_cleaner.suck()
        for ( let b of this.effect ){
            this.agent.beliefs.apply(b)
        }
        yield new Promise(res=>setTimeout(res,100))
        this.log('effects applied')
    }

    static parameters = ['r']
    static precondition = [ ['cleanable', 'r'], ['dirt', 'r'], ['at', 'r'] ]
    static effect = [ ['not dirt', 'r'] ]

}


class Move extends pddlActionIntention {

    *exec () {
        this.agent.devices.vacuum_cleaner.move()
        for ( let b of this.effect )
            this.agent.beliefs.apply(b)
        yield new Promise(res=>setTimeout(res,100))
        this.log('effects applied')
    }

    static parameters = ['r1', 'r2']
    static precondition = [ ['at', 'r1'], ['connected', 'r1', 'r2'] ]
    static effect = [ ['not at', 'r1'], ['at', 'r2'] ]

}


class TurnLightOn extends pddlActionIntention {

    *exec () {
        this.agent.agents.house_agent.perform... // perform turn on light from another agent 
        for ( let b of this.effect )
            this.agent.beliefs.apply(b)
        yield new Promise(res=>setTimeout(res,100))
        this.log('effects applied')
    }

    static parameters = ['r1', 'r2']
    static precondition = [ ['at', 'r1'], ['connected', 'r1', 'r2'] ]
    static effect = [ ['not at', 'r1'], ['at', 'r2'] ]

}

module.exports = {VacuumCleanerDevice, Suck, Move}

// TODO: pddlActionIntention get argument of action