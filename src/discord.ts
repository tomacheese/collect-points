import axios from 'axios'
import * as fs from 'node:fs'
import FormData from 'form-data'
import { CollectConfiguration } from './configuration'

export interface DiscordEmbedFooter {
  text: string
  icon_url?: string
  proxy_icon_url?: string
}

export interface DiscordEmbedImage {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbedThumbnail {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbedVideo {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbedProvider {
  name?: string
  url?: string
}

export interface DiscordEmbedAuthor {
  name?: string
  url?: string
  icon_url?: string
  proxy_icon_url?: string
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbed {
  title?: string
  type?: 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link'
  description?: string
  url?: string
  timestamp?: string
  color?: number
  footer?: DiscordEmbedFooter
  image?: DiscordEmbedImage
  thumbnail?: DiscordEmbedThumbnail
  video?: DiscordEmbedVideo
  provider?: DiscordEmbedProvider
  author?: DiscordEmbedAuthor
  fields?: DiscordEmbedField[]
}

export interface SendDiscordMessageOptions {
  embed?: DiscordEmbed
  isMention?: boolean
  /** スクリーンショットファイルのパス */
  screenshotPath?: string | null
}

export async function sendDiscordMessage(
  config: CollectConfiguration,
  text: string,
  options: SendDiscordMessageOptions = {}
): Promise<void> {
  const { embed, isMention = false, screenshotPath } = options

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!config.discord) {
    return
  }

  if (isMention && config.discord.user_id) {
    text = `<@${config.discord.user_id}> ${text}`
  }

  // webhook or bot
  if (config.discord.webhook_url) {
    // webhook
    if (screenshotPath && fs.existsSync(screenshotPath)) {
      // ファイル添付付きの場合は multipart/form-data を使用
      const form = new FormData()
      form.append(
        'payload_json',
        JSON.stringify({
          content: text,
          embeds: embed ? [embed] : undefined,
        })
      )
      form.append('file', fs.createReadStream(screenshotPath), {
        filename: 'screenshot.png',
        contentType: 'image/png',
      })

      const response = await axios.post(config.discord.webhook_url, form, {
        headers: form.getHeaders(),
      })
      if (response.status !== 200) {
        throw new Error(`Discord webhook with file failed (${response.status})`)
      }
    } else {
      // ファイルなしの場合は JSON
      const response = await axios.post(config.discord.webhook_url, {
        content: text,
        embeds: embed ? [embed] : undefined,
      })
      if (response.status !== 204) {
        throw new Error(`Discord webhook failed (${response.status})`)
      }
    }
    return
  }
  if (config.discord.token && config.discord.channel_id) {
    // bot
    if (screenshotPath && fs.existsSync(screenshotPath)) {
      // ファイル添付付きの場合は multipart/form-data を使用
      const form = new FormData()
      form.append(
        'payload_json',
        JSON.stringify({
          content: text,
          embeds: embed ? [embed] : undefined,
        })
      )
      form.append('file', fs.createReadStream(screenshotPath), {
        filename: 'screenshot.png',
        contentType: 'image/png',
      })

      const response = await axios.post(
        `https://discord.com/api/channels/${config.discord.channel_id}/messages`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bot ${config.discord.token}`,
          },
        }
      )
      if (response.status !== 200) {
        throw new Error(`Discord bot with file failed (${response.status})`)
      }
    } else {
      // ファイルなしの場合は JSON
      const response = await axios.post(
        `https://discord.com/api/channels/${config.discord.channel_id}/messages`,
        {
          content: text,
          embeds: embed ? [embed] : undefined,
        },
        {
          headers: {
            Authorization: `Bot ${config.discord.token}`,
          },
        }
      )
      if (response.status !== 200) {
        throw new Error(`Discord bot failed (${response.status})`)
      }
    }
  }
}
