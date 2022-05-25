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
        let promises = []
        
        let promise = new Promise( async res => {
            while (true) {
                let hh = await Clock.global.notifyChange('hh')
                this.log("total electricity consumption:", this.electricity_utility.total_consumption)
            }
        });
        promises.push(promise)

        this.agent.beliefs.declare("high_electricity_consumption", this.electricity_utility.current_consumption >= 3000)
        promise = new Promise( async res => {
            while (true) {
                await this.electricity_utility.notifyChange('current_consumption')
                this.agent.beliefs.declare("high_electricity_consumption", this.electricity_utility.current_consumption >= 3000)
            }
        });
        promises.push(promise)
        
        yield Promise.all([promise])
    }

}

module.exports = {EnergyMonitorGoal, EnergyMonitorIntention}