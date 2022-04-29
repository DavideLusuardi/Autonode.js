const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


class ShutterDevice extends Observable {
    constructor(name, room){
        let init = {name: name, room: room, status: 'down'}
        super(init)
    }

    goUp(){
        this.status = 'up'
    }
    goDown(){
        this.status = 'down'
    }
}

// class ShutterSensorGoal extends Goal {
//     constructor (shutters) {
//         super()

//         this.shutters = shutters
//     }
// }

// class ShutterSensorIntention extends Intention {
//     constructor (agent, goal) {
//         super(agent, goal)

//         this.shutters = this.goal.shutters
//     }
    
//     static applicable (goal) {
//         return goal instanceof ShutterSensorGoal
//     }

//     *exec () {
//         var shutter_promises = []
//         for (let [name, shutter] of Object.entries(this.shutters)){

//             let shutter_promise = new Promise( async res => {
//                 while (true) {
//                     let hh = await Clock.global.notifyChange('hh')
                    
//                     if(hh <= 6 || hh >= 21){
//                         if(shutter.status == 'up'){
//                             shutter.goDown()
//                             this.log('shutter ' + shutter.room + ' ' + shutter.status)
//                         }
//                     } else {
//                         if(shutter.status == 'down'){
//                             shutter.goUp()
//                             this.log('shutter ' + shutter.room + ' ' + shutter.status)
//                         }
//                     }

//                     this.agent.beliefs.declare(`shutter_up ${shutter.name}`, shutter.status=='up')
//                 }
//             });

//             shutter_promises.push(shutter_promise)
//         }
        
//         yield Promise.all(shutter_promises)
//     }
// }

class ShutterControlGoal extends Goal {
    constructor (shutters) {
        super()

        this.shutters = shutters
    }
}

class ShutterControlIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.shutters = this.goal.shutters
    }
    
    static applicable (goal) {
        return goal instanceof ShutterControlGoal
    }

    *exec () {
        var shutter_promises = []
        for (let [name, shutter] of Object.entries(this.shutters)){

            let shutter_promise = new Promise( async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')
                    let shutter_status = await this.agent.notifyChange(`shutter_up ${shutter.name}`)
                    
                    if(hh <= 6 || hh >= 21){
                        if(shutter.status == 'up'){
                            shutter.goDown()
                            this.log('shutter ' + shutter.room + ' ' + shutter.status)
                        }
                    } else {
                        if(shutter.status == 'down'){
                            shutter.goUp()
                            this.log('shutter ' + shutter.room + ' ' + shutter.status)
                        }
                    }

                    this.agent.beliefs.declare(`shutter_up ${shutter.name}`, shutter.status=='up')
                }
            });

            shutter_promises.push(shutter_promise)
        }
        
        yield Promise.all(shutter_promises)
    }
}

module.exports = {ShutterDevice, ShutterControlGoal, ShutterControlIntention}