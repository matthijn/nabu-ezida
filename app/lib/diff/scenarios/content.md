# Coffee Bean Research

This document contains findings about various coffee beans.

## Overview

Coffee comes in many varieties. The main species are Arabica and Robusta.

| Bean Type | Origin | Flavor Profile |
|-----------|--------|----------------|
| Arabica   | Ethiopia | Sweet, fruity |
| Robusta   | Vietnam | Strong, bitter |
| Liberica  | Philippines | Woody, smoky |

## Processing Methods

There are several ways to process coffee:

- Washed (wet process)
- Natural (dry process)
- Honey process
- Anaerobic fermentation

### Washed Process

The washed process removes the fruit before drying.

```javascript
function washBeans(beans) {
  return beans.filter(b => b.quality > 0.8)
}
```

This produces a cleaner taste.

Further research is needed.

### Natural Process

The natural process dries the whole cherry.

```javascript
function dryBeans(beans) {
  return beans.map(b => ({ ...b, dried: true }))
}
```

This produces fruity flavors.

Further research is needed.

## Roasting Profiles

Roasting transforms green beans into brown coffee.

| Level | Temperature | Time |
|-------|-------------|------|
| Light | 180-205°C | 8-10 min |
| Medium | 210-220°C | 10-12 min |
| Dark | 225-230°C | 12-14 min |

### Light Roast

Light roasts preserve origin characteristics.

### Medium Roast

Medium roasts balance origin and roast flavors.

### Dark Roast

Dark roasts emphasize roast character.

## Equipment Guide

Essential brewing equipment:

- Grinders
  - Blade grinders (inconsistent)
  - Burr grinders
    - Flat burr (uniform)
    - Conical burr (less heat)
- Brewers
  - Pour over
    - V60
    - Chemex
  - Immersion
    - French press
    - AeroPress

## Conclusion

Coffee research continues to evolve.
