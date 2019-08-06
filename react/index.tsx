import { canUseDOM } from 'vtex.render-runtime'
import { PixelMessage } from './typings/events'
import { fetchEmail, getSiteType } from './helpers'

function impression(event: PixelMessage) {
  switch (event.data.eventName) {
    case 'vtex:pageInfo':
      return { event: 'viewHome' }
    case 'vtex:categoryView':
      return {
        event: 'viewList',
        item: event.data.products
          .map(({ productId }: any) => productId)
          .slice(0, 3),
      }
    case 'vtex:productView':
      const {
        data: {
          product: { productId: item },
        },
      } = event.data.product.productId
      return { event: 'viewItem', item }
  }
}

function purchase(event: PixelMessage) {
  const {
    data: { transactionId: id, transactionProducts: products },
  } = event

  const item = products.map(({ id, price, quantity }: any) => ({
    id,
    price,
    quantity,
  }))

  return {
    event: 'trackTransaction',
    id,
    item,
  }
}

function cart(event: PixelMessage) {
  const {
    data: { items },
  } = event

  const item = items.map(({ skuId: id, price, quantity }: any) => ({
    id,
    price,
    quantity,
  }))

  return {
    event: 'viewBasket',
    item,
  }
}

async function handleEvents(event: PixelMessage) {
  switch (event.data.eventName) {
    case 'vtex:pageInfo':
    case 'vtex:categoryView':
    case 'vtex:productView': {
      impression(event)
      break
    }
    case 'vtex:orderPlaced': {
      purchase(event)
      break
    }
    case 'vtex:addToCart': {
      cart(event)
      break
    }
    default:
      break
  }
}

async function handleMessages(event: PixelMessage) {
  const { criteo_q = [], criteo_id: account } = window
  const type = getSiteType()
  if (!account) return
  switch (event.data.eventName) {
    case 'vtex:pageInfo':
    case 'vtex:categoryView':
    case 'vtex:productView':
    case 'vtex:orderPlaced':
    case 'vtex:addToCart': {
      const email = await fetchEmail()
      if (email) {
        const criteoEvent = await handleEvents(event)
        criteo_q.push(
          { event: 'setAccount', account },
          { event: 'setSiteType', type },
          { event: 'setEmail', email: [email] },
          criteoEvent
        )
      }
      break
    }
    default:
      break
  }
}

if (canUseDOM) {
  window.addEventListener('message', handleMessages)
}
