function orderByWeight(vendors){
    const totalWeight = vendors.reduce((sum, v) => sum + (v.weight || 0), 0);
    if(totalWeight <= 0){
        return [...vendors];
    }
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let winner = vendors[vendors.length - 1]; //safety fallback
    for(const v of vendors){
        cumulative += v.weight || 0;
        if(roll <= cumulative){
            winner = v;
            break;
        }
    }

    const rest = vendors.
        filter((v) => v.id !== winner.id).
        sort((a,b) => (b.weight || 0) - (a.weight || 0));
    
    return [winner, ...rest];
}

module.exports = { orderByWeight };