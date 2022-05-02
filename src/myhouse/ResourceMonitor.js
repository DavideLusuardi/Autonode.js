const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')

class EnergyMonitorGoal extends Goal {
    constructor (electricity_utility) {
        super()

        this.electricity_utility = electricity_utility
    }
}

class EnergyMonitorIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.electricity_utility = this.goal.electricity_utility
    }
    
    static applicable (goal) {
        return goal instanceof EnergyMonitorGoal
    }

    *exec () {
        let promise = new Promise( async res => {
            while (true) {
                let hh = await Clock.global.notifyChange('hh')
                this.log("electricity consumption:", this.electricity_utility.consumption)
            }
        });
        
        yield Promise.all([promise])
    }

}

module.exports = {EnergyMonitorGoal, EnergyMonitorIntention}