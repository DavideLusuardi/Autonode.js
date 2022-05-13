const pddlActionIntention = require('../pddl/actions/pddlActionIntention')
const Observable =  require('../utils/Observable')

class LawnMowerDevice extends Observable {
    constructor(name, room){
        let init = {name:name, room: room}
        super(init)
    }

    cut(){
        
    }
    move(){
        
    }
}


class Cut extends pddlActionIntention {

    *exec () {
        this.agent.devices.lawn_mower.cut()
        for ( let b of this.effect ){
            this.agent.beliefs.apply(b)
        }
        yield new Promise(res=>setTimeout(res,100))
        this.log('effects applied')
        // this.log(this.agent.beliefs)
    }

    static parameters = ['a']
    static precondition = [ ['not-raining'], ['not-people-detected'], ['tall-grass', 'a'], ['at', 'a'] ]
    static effect = [ ['not tall-grass', 'a'] ]

}


class Move extends pddlActionIntention {

    *exec () {
        this.agent.devices.lawn_mower.move()
        for ( let b of this.effect )
            this.agent.beliefs.apply(b)
        yield new Promise(res=>setTimeout(res,100))
        this.log('effects applied')
        // this.log(this.agent.beliefs)
    }

    static parameters = ['a1', 'a2']
    static precondition = [ ['at', 'a1'], ['connected', 'a1', 'a2'] ]
    static effect = [ ['not at', 'a1'], ['at', 'a2'] ]

}



module.exports = {LawnMowerDevice, Cut, Move}